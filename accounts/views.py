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
from .models import OTPVerification
from doctors.models import Doctor, Specialty
from doctors.serializers import DoctorSerializer
from patients.models import Patient
from patients.serializers import PatientSerializer
from datetime import timedelta
from medibook.settings import DEFAULT_FROM_EMAIL

# Django views for rendering templates
def login_view(request):
    return render(request, 'accounts/login.html')

def register_view(request):
    return render(request, 'accounts/register.html')

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

class PatientRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        temp_token = request.data.get('temp_token')
        if not temp_token:
            return Response({"detail": "Thiếu temp_token từ verify OTP."}, status=400)
        try:
            UntypedToken(temp_token)
        except Exception:
            return Response({"detail": "Temp token không hợp lệ hoặc hết hạn."}, status=400)
        
        data = request.data

        # Validate user fields
        required_user = ["username", "email", "password", "phone_number"]
        required_patient = ["dob", "gender"]

        for f in required_user + required_patient:
            if not data.get(f):
                return Response({"detail": f"Missing field: {f}"}, status=400)

        if User.objects.filter(username=data["username"]).exists():
            return Response({"detail": "Username already exists"}, status=400)
        if User.objects.filter(email=data["email"]).exists():
            return Response({"detail": "Email already exists"}, status=400)

        # Create user
        user = User(
            username=data["username"],
            email=data["email"],
        )
        if hasattr(user, "full_name") and data.get("full_name"):
            user.full_name = data["full_name"]
        if hasattr(user, "phone_number") and data.get("phone_number"):
            user.phone_number = data["phone_number"]
        if hasattr(user, "address") and data.get("address"):
            user.address = data["address"] 
        user.set_password(data["password"])
        user.save()

        # Create patient 
        patient = Patient.objects.create(
            user=user,
            dob=data["dob"],
            gender=data["gender"],
            insurance_no=data.get("insurance_no", ""),
        )

        OTPVerification.objects.filter(email=data['email']).delete()

        refresh, access = issue_tokens(user)
        return Response({
            "message": "Register patient success",
            "user": UserSerializer(user).data,
            "patient": PatientSerializer(patient).data,
            "refresh": refresh,
            "access": access
        }, status=status.HTTP_201_CREATED)

class DoctorRegisterView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @transaction.atomic
    def post(self, request):
        data = request.data

        # Validate user fields
        required_user = ["username", "email", "password", "phone_number"]
        for f in required_user:
            if not data.get(f):
                return Response({"detail": f"Missing field: {f}"}, status=400)

        if User.objects.filter(username=data["username"]).exists():
            return Response({"detail": "Username already exists"}, status=400)
        if User.objects.filter(email=data["email"]).exists():
            return Response({"detail": "Email already exists"}, status=400)

        # Handle specialty
        spec = None
        spec_id = data.get("specialty_id")
        spec_name = data.get("specialty")
        if spec_id not in (None, "",):
            spec = get_object_or_404(Specialty, pk=spec_id, is_active=True)
        elif spec_name:
            spec, _ = Specialty.objects.get_or_create(name=str(spec_name).strip(), defaults={"is_active": True})
        else:
            return Response({"detail": "Missing field: specialty_id (or 'specialty' name)."}, status=400)

        # Handle gender
        gender = data.get("gender")
        if gender:
            gender = str(gender).upper()
            if gender not in ("MALE", "FEMALE"):
                return Response({"detail": "Invalid gender. Use MALE/FEMALE."}, status=400)
        else:
            gender = None

        # Create user
        user = User(
            username=data["username"],
            email=data["email"],
            full_name=data.get("full_name"),
            phone_number=data.get("phone_number"),
            role="DOCTOR",
            is_active=True,  
        )
        user.set_password(data["password"])
        user.save()

        # Create doctor
        doctor = Doctor.objects.create(
            user=user,
            gender=data["gender"],
            specialty=spec,
            bio=data.get("bio", "Bác sĩ chưa cập nhật tiểu sử."),
            dob=data.get("dob"),
            address=data.get("address", ""),
            profile_picture=data.get("profile_picture"),
            is_active=True,
        )

        # 6) Token & response
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