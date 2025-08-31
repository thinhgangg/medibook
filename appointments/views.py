from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from .models import Appointment
from .serializers import AppointmentSerializer, AppointmentCreateSerializer

class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin xem tất cả
        if user.is_staff or user.is_superuser:
            return Appointment.objects.all()
        # Bác sĩ: lịch của mình
        if hasattr(user, "doctor_profile"):
            return Appointment.objects.filter(doctor=user.doctor_profile)
        # Bệnh nhân: lịch của mình
        if hasattr(user, "patient_profile"):
            return Appointment.objects.filter(patient=user.patient_profile)
        # Không có hồ sơ
        return Appointment.objects.none()

    def get_serializer_class(self):
        return AppointmentCreateSerializer if self.action == "create" else AppointmentSerializer

    def perform_create(self, serializer):
        user = self.request.user
        # Chỉ bệnh nhân mới được tạo lịch (v1)
        if not hasattr(user, "patient_profile"):
            raise PermissionDenied("Chỉ bệnh nhân mới được đặt lịch.")
        # Gán patient, giữ doctor theo payload
        appt = serializer.save(patient=user.patient_profile)
        # Trả data chi tiết v2
        self._created_instance = appt  # giữ để dùng ở create()

    def create(self, request, *args, **kwargs):
        # override để trả serializer chi tiết sau khi tạo
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = AppointmentSerializer(self._created_instance).data
        headers = self.get_success_headers(serializer.data)
        return Response(detail, status=status.HTTP_201_CREATED, headers=headers)

    # ---- Actions trạng thái ----
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        user = request.user
        # Bệnh nhân hoặc bác sĩ của lịch đều có thể huỷ
        if not (hasattr(user, "patient_profile") or hasattr(user, "doctor_profile")):
            return Response({"detail": "Không có quyền."}, status=403)
        appt.status = Appointment.Status.CANCELLED
        appt.save()
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        # Chỉ bác sĩ xác nhận
        if not hasattr(request.user, "doctor_profile"):
            return Response({"detail": "Chỉ bác sĩ được xác nhận."}, status=403)
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        appt.status = Appointment.Status.CONFIRMED
        appt.save()
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        # Chỉ bác sĩ hoàn tất
        if not hasattr(request.user, "doctor_profile"):
            return Response({"detail": "Chỉ bác sĩ được đánh dấu hoàn tất."}, status=403)
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        appt.status = Appointment.Status.COMPLETED
        appt.save()
        return Response(AppointmentSerializer(appt).data)
