from datetime import datetime
from django.utils import timezone
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
        qs = Appointment.objects.all()

        # Quyền xem: admin thấy tất; bác sĩ/bệnh nhân thấy của mình
        if user.is_staff or user.is_superuser:
            base = qs
        elif hasattr(user, "doctor_profile"):
            base = qs.filter(doctor=user.doctor_profile)
        elif hasattr(user, "patient_profile"):
            base = qs.filter(patient=user.patient_profile)
        else:
            return Appointment.objects.none()

        # ----- Filters -----
        params = self.request.query_params
        status_q = params.get("status")          
        doctor_id = params.get("doctor_id")      
        patient_id = params.get("patient_id")    
        date_from = params.get("date_from")     
        date_to   = params.get("date_to")      

        if status_q:
            base = base.filter(status=status_q)

        if doctor_id:
            base = base.filter(doctor_id=doctor_id)

        if patient_id:
            base = base.filter(patient_id=patient_id)

        # Lọc theo khoảng ngày (đụng vào start_at)
        def to_aware(dt):
            return timezone.make_aware(datetime.combine(dt.date(), datetime.min.time()), timezone.get_currentTimezone())  # not strictly needed

        if date_from:
            try:
                df = datetime.fromisoformat(date_from)
                base = base.filter(start_at__date__gte=df.date())
            except ValueError:
                pass

        if date_to:
            try:
                dt = datetime.fromisoformat(date_to)
                base = base.filter(start_at__date__lte=dt.date())
            except ValueError:
                pass

        return base.order_by("-start_at")

    def get_serializer_class(self):
        return AppointmentCreateSerializer if self.action == "create" else AppointmentSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, "patient_profile"):
            raise PermissionDenied("Chỉ bệnh nhân mới được đặt lịch.")
        self._created_instance = serializer.save(patient=user.patient_profile)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        self.perform_create(ser)
        detail = AppointmentSerializer(self._created_instance).data
        headers = self.get_success_headers(ser.data)
        return Response(detail, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        appt.status = Appointment.Status.CANCELLED
        appt.save()
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        if not hasattr(request.user, "doctor_profile"):
            return Response({"detail": "Chỉ bác sĩ được xác nhận."}, status=403)
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        appt.status = Appointment.Status.CONFIRMED
        appt.save()
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        if not hasattr(request.user, "doctor_profile"):
            return Response({"detail": "Chỉ bác sĩ được đánh dấu hoàn tất."}, status=403)
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        appt.status = Appointment.Status.COMPLETED
        appt.save()
        return Response(AppointmentSerializer(appt).data)
