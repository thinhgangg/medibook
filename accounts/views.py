from django.shortcuts import render
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import render, get_object_or_404
from django.core.mail import send_mail
from rest_framework.permissions import IsAdminUser
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework.permissions import AllowAny
from accounts.serializers import UserSerializer
from .serializers import UserPublicSerializer, UserUpdateSerializer
from .serializers import SendOTPSerializer, VerifyOTPSerializer
from .serializers import SetPasswordSerializer
from .models import OTPVerification
from doctors.models import Doctor, Specialty
from doctors.serializers import DoctorSerializer
from patients.models import Patient
from patients.serializers import PatientSerializer
from datetime import timedelta
from medibook.settings import DEFAULT_FROM_EMAIL

# Django views for rendering templates
def login_register_view(request):
    action = request.GET.get("action", "login")
    return render(request, "accounts/login.html", {"action": action})

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return render(request, "accounts/forgot-password.html")

# API Views for handling authentication and registration
User = get_user_model()

def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh), str(refresh.access_token)

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resp = super().post(request, *args, **kwargs)
        user = serializer.user
        resp.data["user"] = UserSerializer(user).data
        return resp

class DoctorRegisterView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @transaction.atomic
    def post(self, request):
        data = request.data

        required_user = ["email", "password", "full_name", "phone_number", "gender", "specialty_id"]
        for f in required_user:
            if not data.get(f):
                return Response({"detail": f"Missing field: {f}"}, status=400)

        if User.objects.filter(email=data["email"]).exists():
            return Response({"detail": "Email already exists"}, status=400)

        spec = None
        spec_id = data.get("specialty_id")
        spec_name = data.get("specialty")
        if spec_id not in (None, "",):
            spec = get_object_or_404(Specialty, pk=spec_id, is_active=True)
        elif spec_name:
            spec, _ = Specialty.objects.get_or_create(name=str(spec_name).strip(), defaults={"is_active": True})
        else:
            return Response({"detail": "Missing field: specialty_id (or 'specialty' name)."}, status=400)

        gender = data.get("gender")
        if gender:
            gender = str(gender).upper()
            if gender not in ("MALE", "FEMALE"):
                return Response({"detail": "Invalid gender. Use MALE/FEMALE."}, status=400)
        else:
            gender = None

        user = User(
            email=data["email"],
            full_name=data.get("full_name"),
            phone_number=data.get("phone_number"),
            dob=data.get("dob"),
            gender=data.get("gender"),
            address_detail=data.get("address_detail"),
            ward=data.get("ward"),
            district=data.get("district"),
            city=data.get("city"),
            id_number=data.get("id_number"),
            ethnicity=data.get("ethnicity"),
            role="DOCTOR",
        )
        user.set_password(data["password"])
        user.save()

        doctor = Doctor.objects.create(
            user=user,
            specialty=spec,
            bio=data.get("bio", "Bác sĩ chưa cập nhật tiểu sử."),
            profile_picture=data.get("profile_picture"),
            is_active=True,
        )

        return Response(
            {
                "message": "Register doctor success",
                "user": UserSerializer(user).data,
                "doctor": DoctorSerializer(doctor).data,
            },
            status=status.HTTP_201_CREATED,
        )

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        user = request.user
        data = UserPublicSerializer(user).data
        if hasattr(user, "doctor_profile"):
            data["doctor"] = DoctorSerializer(user.doctor_profile).data
        if hasattr(user, "patient_profile"):
            data["patient"] = PatientSerializer(user.patient_profile).data
        return Response(data)

    def patch(self, request):
        user = request.user

        # 1) Cập nhật thông tin user
        user_ser = UserUpdateSerializer(user, data=request.data, partial=True)
        user_ser.is_valid(raise_exception=True)
        user_ser.save()

        # 2) Cập nhật avatar cho doctor/patient (nếu có)
        has_file = "profile_picture" in request.FILES or "profile_picture" in request.data
        want_remove = str(request.data.get("remove_profile_picture", "")).lower() in ("1", "true", "yes")

        updated_doctor = None
        updated_patient = None

        if has_file or want_remove:
            # Nếu 1 user vừa là doctor vừa là patient (hiếm), cho phép chỉ định profile_owner=doctor|patient
            target = str(request.data.get("profile_owner", "")).lower()
            obj = None

            if target == "doctor" and hasattr(user, "doctor_profile"):
                obj = user.doctor_profile
            elif target == "patient" and hasattr(user, "patient_profile"):
                obj = user.patient_profile
            else:
                # nếu không chỉ định, tự suy ra
                if hasattr(user, "doctor_profile") and not hasattr(user, "patient_profile"):
                    obj = user.doctor_profile
                elif hasattr(user, "patient_profile") and not hasattr(user, "doctor_profile"):
                    obj = user.patient_profile
                elif hasattr(user, "doctor_profile") and hasattr(user, "patient_profile"):
                    return Response(
                        {"detail": "Vui lòng chỉ định 'profile_owner' = 'doctor' hoặc 'patient'."},
                        status=400
                    )
                else:
                    return Response({"detail": "Chỉ bác sĩ hoặc bệnh nhân mới cập nhật avatar."}, status=403)

            if want_remove:
                if getattr(obj, "profile_picture", None):
                    obj.profile_picture = None
            else:
                file_obj = request.FILES.get("profile_picture") or request.data.get("profile_picture")
                if not file_obj:
                    return Response({"detail": "Thiếu file profile_picture."}, status=400)
                obj.profile_picture = file_obj

            obj.save()
            if obj is getattr(user, "doctor_profile", None):
                updated_doctor = obj
            if obj is getattr(user, "patient_profile", None):
                updated_patient = obj

        # 3) Response gồm user + profile
        resp = UserPublicSerializer(user).data
        if hasattr(user, "doctor_profile"):
            resp["doctor"] = DoctorSerializer(updated_doctor or user.doctor_profile).data
        if hasattr(user, "patient_profile"):
            resp["patient"] = PatientSerializer(updated_patient or user.patient_profile).data
        return Response(resp, status=status.HTTP_200_OK)
    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logout successful"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"detail": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        
class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        OTPVerification.objects.filter(email=email).delete()

        otp_obj = OTPVerification(email=email)
        otp_obj.save()

        subject = 'Mã OTP Đăng Ký MediBook'
        message = f'Mã OTP của bạn là: {otp_obj.otp}. Mã hết hạn sau 5 phút.'
        send_mail(subject, message, DEFAULT_FROM_EMAIL, [email])

        return Response({"message": "OTP đã gửi đến email của bạn."}, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        try:
            otp_obj = OTPVerification.objects.get(email=email, otp=otp)
            if otp_obj.is_expired():
                return Response({"detail": "OTP đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)
            if otp_obj.is_verified:
                return Response({"detail": "OTP đã được sử dụng."}, status=status.HTTP_400_BAD_REQUEST)

            otp_obj.is_verified = True
            otp_obj.save()

            temp_token = RefreshToken()
            temp_token.set_exp(lifetime=timedelta(minutes=10)) 
            return Response({
                "message": "Xác thực OTP thành công.",
                "temp_token": str(temp_token)
            }, status=status.HTTP_200_OK)

        except OTPVerification.DoesNotExist:
            return Response({"detail": "OTP không đúng."}, status=status.HTTP_400_BAD_REQUEST)
        
class PatientSetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password1"]
        temp_token = request.data.get("temp_token")

        # check temp token
        try:
            UntypedToken(temp_token)
        except Exception:
            return Response({"detail": "Temp token không hợp lệ hoặc hết hạn."}, status=400)

        # check OTP verified
        try:
            otp_obj = OTPVerification.objects.get(email=email, is_verified=True)
        except OTPVerification.DoesNotExist:
            return Response({"detail": "OTP chưa được xác thực."}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email đã tồn tại."}, status=400)

        # tạo user bệnh nhân
        user = User(email=email, role="PATIENT")
        user.set_password(password)
        user.save()

        # xóa OTP
        otp_obj.delete()

        refresh, access = issue_tokens(user)
        return Response({
            "message": "Tạo mật khẩu thành công, tiếp tục hoàn thiện hồ sơ.",
            "user": UserSerializer(user).data,
            "refresh": refresh,
            "access": access,
        }, status=201)

class PatientProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        if user.role != "PATIENT":
            return Response({"detail": "Chỉ bệnh nhân mới được cập nhật hồ sơ."}, status=403)

        data = request.data

        # update các field hồ sơ cơ bản
        user.full_name = data.get("full_name", user.full_name)
        user.phone_number = data.get("phone_number", user.phone_number)
        user.dob = data.get("dob", user.dob)
        user.gender = data.get("gender", user.gender)
        user.address_detail = data.get("address_detail", user.address_detail)
        user.ward = data.get("ward", user.ward)
        user.district = data.get("district", user.district)
        user.city = data.get("city", user.city)
        user.id_number = data.get("id_number", user.id_number)
        user.ethnicity = data.get("ethnicity", user.ethnicity)
        user.save()

        # tạo hoặc cập nhật profile patient
        patient, created = Patient.objects.get_or_create(user=user)
        patient.insurance_no = data.get("insurance_no", patient.insurance_no)
        patient.occupation = data.get("occupation", patient.occupation)
        patient.save()

        return Response({
            "message": "Cập nhật hồ sơ thành công",
            "user": UserSerializer(user).data,
            "patient": PatientSerializer(patient).data
        }, status=200)
