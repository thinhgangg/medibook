from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404, render
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q

from .models import Patient
from .serializers import PatientSerializer

class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Patient.objects.select_related('user').prefetch_related('appointments')
        return Patient.objects.filter(user=user).select_related('user')

    def perform_create(self, serializer):
        if Patient.objects.filter(user=self.request.user).exists():
            raise ValidationError("Hồ sơ bệnh nhân của bạn đã tồn tại. Vui lòng cập nhật thay vì tạo mới.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            raise ValidationError("Bạn không có quyền xóa hồ sơ này.")
        instance.delete()

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        GET  /patients/me/  -> lấy hồ sơ bệnh nhân của chính mình
        PATCH /patients/me/ -> cập nhật hồ sơ của chính mình
        """
        try:
            obj = Patient.objects.get(user=request.user)
        except ObjectDoesNotExist:
            raise ValidationError("Hồ sơ bệnh nhân của bạn chưa được tạo. Vui lòng tạo hồ sơ trước.")

        if request.method == 'GET':
            return Response(self.get_serializer(obj).data)

        serializer = self.get_serializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='appointments')
    def get_appointments(self, request, pk=None):
        """
        GET /patients/<pk>/appointments/ -> lấy lịch sử hẹn của bệnh nhân
        """
        patient = self.get_object()
        from .models import Appointment
        appointments = Appointment.objects.filter(patient=patient).select_related('doctor')
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)

# Thêm function-based view cho trang profile
@login_required
def patient_profile_view(request):
    """
    Hiển thị trang hồ sơ bệnh nhân
    """
    try:
        patient = Patient.objects.get(user=request.user)
    except Patient.DoesNotExist:
        patient = None
    context = {'patient': patient}
    return render(request, 'patient_profile.html', context)