# accounts/views.py
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import UserSerializer
from .serializers import UserPublicSerializer, UserUpdateSerializer

from doctors.models import Doctor, Specialty
from doctors.serializers import DoctorSerializer
from patients.models import Patient
from patients.serializers import PatientSerializer

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
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @transaction.atomic
    def post(self, request):
        data = request.data

        # 1) Validate user cơ bản
        required_user = ["username", "email", "password", "phone_number"]
        for f in required_user:
            if not data.get(f):
                return Response({"detail": f"Missing field: {f}"}, status=400)

        if User.objects.filter(username=data["username"]).exists():
            return Response({"detail": "Username already exists"}, status=400)
        if User.objects.filter(email=data["email"]).exists():
            return Response({"detail": "Email already exists"}, status=400)

        # 2) Lấy specialty: ưu tiên specialty_id, fallback theo tên 'specialty'
        spec = None
        spec_id = data.get("specialty_id")
        spec_name = data.get("specialty")
        if spec_id not in (None, "",):
            spec = get_object_or_404(Specialty, pk=spec_id, is_active=True)
        elif spec_name:
            spec, _ = Specialty.objects.get_or_create(name=str(spec_name).strip(), defaults={"is_active": True})
        else:
            return Response({"detail": "Missing field: specialty_id (or 'specialty' name)."}, status=400)

        # 3) Chuẩn hoá gender -> MALE/FEMALE (optional)
        gender = data.get("gender")
        if gender:
            gender = str(gender).upper()
            if gender not in ("MALE", "FEMALE"):
                return Response({"detail": "Invalid gender. Use MALE/FEMALE."}, status=400)
        else:
            gender = None

        # 4) Tạo user (role=DOCTOR)
        user = User(
            username=data["username"],
            email=data["email"],
            full_name=data.get("full_name"),
            phone_number=data.get("phone_number"),
            role="DOCTOR",
        )
        user.set_password(data["password"])
        user.save()

        # 5) Tạo Doctor (KHÔNG còn 'hospital')
        doctor = Doctor.objects.create(
            user=user,
            gender=gender,
            specialty=spec,
            bio=data.get("bio"),
            profile_picture=data.get("profile_picture"),  # hỗ trợ multipart
            is_active=True,
        )

        # 6) Token & response
        refresh, access = issue_tokens(user)
        return Response(
            {
                "message": "Register doctor success",
                "user": UserSerializer(user).data,
                "doctor": DoctorSerializer(doctor).data,
                "refresh": refresh,
                "access": access,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserPublicSerializer(request.user).data)

    def patch(self, request):
        ser = UserUpdateSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserPublicSerializer(request.user).data)