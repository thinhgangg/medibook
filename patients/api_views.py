from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Patient
from .serializers import PatientSerializer

class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Patient.objects.all() if (user.is_staff or user.is_superuser) else Patient.objects.filter(user=user)

    def perform_create(self, serializer):
        if Patient.objects.filter(user=self.request.user).exists():
            raise ValidationError("Hồ sơ bệnh nhân của bạn đã tồn tại.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        GET  /patients/me/  -> lấy hồ sơ bệnh nhân của chính mình
        PATCH/patients/me/  -> cập nhật hồ sơ của chính mình
        """
        obj = get_object_or_404(Patient, user=request.user)

        if request.method == 'GET':
            return Response(self.get_serializer(obj).data)

        # PATCH
        serializer = self.get_serializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)
