# accounts/views.py
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import UserSerializer
from patients.models import Patient
from doctors.models import Doctor
from patients.serializers import PatientSerializer
from doctors.serializers import DoctorSerializer

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UserPublicSerializer, UserUpdateSerializer

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
        data = request.data

        # YÊU CẦU: có phone_number nhưng sẽ lưu trên User
        required_user = ["username", "email", "password", "phone_number"]
        required_patient = ["dob", "gender"]  # KHÔNG có 'phone_number' ở đây nữa

        for f in required_user + required_patient:
            if not data.get(f):
                return Response({"detail": f"Missing field: {f}"}, status=400)

        if User.objects.filter(username=data["username"]).exists():
            return Response({"detail": "Username already exists"}, status=400)
        if User.objects.filter(email=data["email"]).exists():
            return Response({"detail": "Email already exists"}, status=400)

        # 1) Tạo user và LƯU PHONE TẠI ĐÂY
        user = User(
            username=data["username"],
            email=data["email"],
        )
        if hasattr(user, "full_name") and data.get("full_name"):
            user.full_name = data["full_name"]
        if hasattr(user, "phone_number") and data.get("phone_number"):
            user.phone_number = data["phone_number"]  # <<<<<<<<<<<<<< gán ở user
        user.set_password(data["password"])
        user.save()

        # 2) Tạo Patient (KHÔNG truyền phone_number vào đây)
        patient = Patient.objects.create(
            user=user,
            dob=data["dob"],
            gender=data["gender"],
            insurance_no=data.get("insurance_no", ""),
        )

        refresh, access = issue_tokens(user)
        return Response({
            "message": "Register patient success",
            "user": UserSerializer(user).data,
            "patient": PatientSerializer(patient).data,
            "refresh": refresh,
            "access": access
        }, status=status.HTTP_201_CREATED)


class DoctorRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        data = request.data

        required_user = ["username", "email", "password", "phone_number"]
        required_doctor = ["gender", "specialty", "bio", "hospital"]

        for f in required_user + required_doctor:
            if not data.get(f):
                return Response({"detail": f"Missing field: {f}"}, status=400)

        if User.objects.filter(username=data["username"]).exists():
            return Response({"detail": "Username already exists"}, status=400)
        if User.objects.filter(email=data["email"]).exists():
            return Response({"detail": "Email already exists"}, status=400)

        # 1) Tạo user và LƯU PHONE TẠI ĐÂY
        user = User(
            username=data["username"],
            email=data["email"],
        )
        if hasattr(user, "full_name") and data.get("full_name"):
            user.full_name = data["full_name"]
        if hasattr(user, "phone_number") and data.get("phone_number"):
            user.phone_number = data["phone_number"]  # <<<<<<<<<<<<<< gán ở user
        user.set_password(data["password"])
        user.save()

        # 2) Tạo Doctor (KHÔNG truyền phone_number)
        doctor_kwargs = {
            "gender": data["gender"],
            "bio": data["bio"],
        }
        # specialty / hospital: chấp nhận id hoặc text (nếu là CharField)
        if data.get("specialty_id") is not None:
            doctor_kwargs["specialty_id"] = data["specialty_id"]
        else:
            if isinstance(data.get("specialty"), int) or (isinstance(data.get("specialty"), str) and data["specialty"].isdigit()):
                doctor_kwargs["specialty_id"] = int(data["specialty"])
            else:
                doctor_kwargs["specialty"] = data["specialty"]

        if data.get("hospital_id") is not None:
            doctor_kwargs["hospital_id"] = data["hospital_id"]
        else:
            if isinstance(data.get("hospital"), int) or (isinstance(data.get("hospital"), str) and data["hospital"].isdigit()):
                doctor_kwargs["hospital_id"] = int(data["hospital"])
            else:
                doctor_kwargs["hospital"] = data["hospital"]

        doctor = Doctor.objects.create(user=user, **doctor_kwargs)

        refresh, access = issue_tokens(user)
        return Response({
            "message": "Register doctor success",
            "user": UserSerializer(user).data,
            "doctor": DoctorSerializer(doctor).data,
            "refresh": refresh,
            "access": access
        }, status=status.HTTP_201_CREATED)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserPublicSerializer(request.user).data)

    def patch(self, request):
        ser = UserUpdateSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserPublicSerializer(request.user).data)