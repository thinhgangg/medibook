from datetime import timedelta

from django.contrib.auth import get_user_model, login
from django.contrib.auth import logout as django_logout
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from accounts.serializers import (
    UserSerializer,
    UserPublicSerializer,
    UserUpdateSerializer,
    SendOTPSerializer,
    VerifyOTPSerializer,
    SetPasswordSerializer,
    ForgotPasswordSendOTPSerializer,
)
from accounts.models import OTPVerification

from doctors.models import Doctor, Specialty
from doctors.serializers import DoctorSerializer

from patients.models import Patient
from patients.serializers import PatientSerializer

from medibook.settings import DEFAULT_FROM_EMAIL


User = get_user_model()

def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh), str(refresh.access_token)

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response = super().post(request, *args, **kwargs)

        user = serializer.user
        login(request, user)

        response.data['success'] = True
        response.data['message'] = 'Login successful'
        response.data['user'] = UserSerializer(user).data

        return response

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
            started_practice=data.get("started_practice"),
            experience_detail=data.get("experience_detail", "Bác sĩ chưa cập nhật thông tin chi tiết về kinh nghiệm."),
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

        user_ser = UserUpdateSerializer(user, data=request.data, partial=True)
        user_ser.is_valid(raise_exception=True)
        user_ser.save()

        updated_doctor, updated_patient = None, None

        if hasattr(user, "doctor_profile"):
            doc_ser = DoctorSerializer(
                user.doctor_profile,
                data=request.data,
                partial=True,
                context={"request": request},  
            )
            doc_ser.is_valid(raise_exception=True)
            updated_doctor = doc_ser.save()

        if hasattr(user, "patient_profile"):
            pat_ser = PatientSerializer(
                user.patient_profile,
                data=request.data,
                partial=True,
                context={"request": request},
            )
            pat_ser.is_valid(raise_exception=True)
            updated_patient = pat_ser.save()

        resp = UserPublicSerializer(user).data
        if updated_doctor:
            resp["doctor"] = DoctorSerializer(updated_doctor).data
        elif hasattr(user, "doctor_profile"):
            resp["doctor"] = DoctorSerializer(user.doctor_profile).data

        if updated_patient:
            resp["patient"] = PatientSerializer(updated_patient).data
        elif hasattr(user, "patient_profile"):
            resp["patient"] = PatientSerializer(user.patient_profile).data

        return Response(resp, status=status.HTTP_200_OK)
    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except Exception:
                    pass  

            django_logout(request)

            return Response({"detail": "Logout successful"}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"detail": "Logout failed", "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
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

        try:
            UntypedToken(temp_token)
        except Exception:
            return Response({"detail": "Temp token không hợp lệ hoặc hết hạn."}, status=400)

        try:
            otp_obj = OTPVerification.objects.get(email=email, is_verified=True)
        except OTPVerification.DoesNotExist:
            return Response({"detail": "OTP chưa được xác thực."}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập nếu bạn đã có tài khoản."}, status=400)

        user = User(email=email, role="PATIENT")
        user.set_password(password)
        user.save()

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

        patient, created = Patient.objects.get_or_create(user=user)
        patient.insurance_no = data.get("insurance_no", patient.insurance_no)
        patient.occupation = data.get("occupation", patient.occupation)
        patient.save()

        return Response({
            "message": "Cập nhật hồ sơ thành công",
            "user": UserSerializer(user).data,
            "patient": PatientSerializer(patient).data
        }, status=200)

class ForgotPasswordSendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user_exists = User.objects.filter(email=email).exists()

        OTPVerification.objects.filter(email=email).delete()

        otp_obj = OTPVerification(email=email)
        otp_obj.save()

        if user_exists:
            subject = 'Mã OTP Đặt Lại Mật Khẩu MediBook'
            message = f'Mã OTP của bạn là: {otp_obj.otp}. Mã hết hạn sau 5 phút. Không chia sẻ mã này với bất kỳ ai.'
            try:
                send_mail(subject, message, DEFAULT_FROM_EMAIL, [email])
            except Exception as e:
                print(f"Failed to send email: {str(e)}")
                return Response({
                    "message": "Có lỗi xảy ra khi gửi OTP. Vui lòng thử lại sau."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": "Nếu email tồn tại, OTP đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra hộp thư (bao gồm spam)."
        }, status=status.HTTP_200_OK)


class ForgotPasswordVerifyOTPView(APIView):
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

class ForgotPasswordSetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password1"]
        temp_token = request.data.get("temp_token")

        try:
            UntypedToken(temp_token)
        except Exception:
            return Response({"detail": "Temp token không hợp lệ hoặc hết hạn."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_obj = OTPVerification.objects.get(email=email, is_verified=True)
        except OTPVerification.DoesNotExist:
            return Response({"detail": "OTP chưa được xác thực."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Email không tồn tại."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        otp_obj.delete()

        refresh, access = issue_tokens(user)
        return Response({
            "message": "Đặt lại mật khẩu thành công.",
            "user": UserSerializer(user).data,
            "refresh": refresh,
            "access": access,
        }, status=status.HTTP_200_OK)
