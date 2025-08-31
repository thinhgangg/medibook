from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Doctor
from .serializers import DoctorSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin xem tất cả; user thường chỉ xem hồ sơ của chính mình
        return Doctor.objects.all() if (user.is_staff or user.is_superuser) else Doctor.objects.filter(user=user)

    def perform_create(self, serializer):
        if Doctor.objects.filter(user=self.request.user).exists():
            raise ValidationError("Hồ sơ bác sĩ của bạn đã tồn tại.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # Luôn khóa về đúng user hiện tại
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        GET  /doctors/me/   -> lấy hồ sơ bác sĩ của chính mình
        PATCH/doctors/me/   -> cập nhật hồ sơ của chính mình
        """
        obj = get_object_or_404(Doctor, user=request.user)

        if request.method == 'GET':
            return Response(self.get_serializer(obj).data)

        # PATCH
        serializer = self.get_serializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)  # chặn đổi user
        return Response(serializer.data)
