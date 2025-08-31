from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, SAFE_METHODS
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta, date as date_cls

from .models import Doctor, DoctorAvailability
from .serializers import DoctorSerializer, DoctorAvailabilitySerializer

class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer
    
    def get_permissions(self):
        # Cho phép ai cũng GET danh bạ bác sĩ; còn lại cần đăng nhập
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        # Public directory
        return Doctor.objects.all()

    def perform_create(self, serializer):
        if Doctor.objects.filter(user=self.request.user).exists():
            raise PermissionDenied("Hồ sơ bác sĩ của bạn đã tồn tại.")
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

    @action(detail=True, methods=['get'], url_path='slots')
    def slots(self, request, pk=None):
        """
        GET /doctors/{id}/slots/?date=YYYY-MM-DD
        Trả list slot trống (đã loại các lịch hẹn confirmed/pending).
        """
        from appointments.models import Appointment  # tránh import vòng
        doctor = self.get_object()

        date_str = request.query_params.get('date')
        if not date_str:
            return Response({"detail": "Missing query param: date=YYYY-MM-DD"}, status=400)
        try:
            target_date = date_cls.fromisoformat(date_str)
        except ValueError:
            return Response({"detail": "Invalid date format"}, status=400)

        weekday = target_date.weekday()
        avails = doctor.availabilities.filter(weekday=weekday, is_active=True)
        if not avails.exists():
            return Response([])

        # Lấy các cuộc hẹn cùng ngày (trừ CANCELLED)
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day   = datetime.combine(target_date, datetime.max.time())
        tz = timezone.get_current_timezone()
        start_of_day = timezone.make_aware(start_of_day, tz)
        end_of_day   = timezone.make_aware(end_of_day, tz)

        taken = doctor.appointments.exclude(status="CANCELLED")\
            .filter(start_at__lt=end_of_day, end_at__gt=start_of_day)\
            .values_list("start_at", "end_at")

        # Build danh sách slot
        now = timezone.now()
        busy = [(s, e) for s, e in taken]  # list of aware datetimes
        slots = []

        for av in avails:
            slot_len = timedelta(minutes=av.slot_minutes)
            cur = timezone.make_aware(datetime.combine(target_date, av.start_time), tz)
            limit = timezone.make_aware(datetime.combine(target_date, av.end_time), tz)

            while cur + slot_len <= limit:
                slot_start = cur
                slot_end   = cur + slot_len

                # loại slot quá khứ (nếu là hôm nay)
                if slot_end <= now:
                    cur += slot_len
                    continue

                # check overlap với busy
                overlap = any((slot_start < b_end and slot_end > b_start) for b_start, b_end in busy)
                if not overlap:
                    slots.append({
                        "start_at": slot_start.isoformat(),
                        "end_at":   slot_end.isoformat()
                    })
                cur += slot_len

        return Response(slots)

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return DoctorAvailability.objects.all()
        if hasattr(user, "doctor_profile"):
            return DoctorAvailability.objects.filter(doctor=user.doctor_profile)
        return DoctorAvailability.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "doctor_profile"):
            raise PermissionDenied("Chỉ bác sĩ mới thiết lập lịch làm việc.")
        serializer.save(doctor=self.request.user.doctor_profile)

    def perform_update(self, serializer):
        if not hasattr(self.request.user, "doctor_profile"):
            raise PermissionDenied("Chỉ bác sĩ mới sửa lịch làm việc.")
        serializer.save(doctor=self.request.user.doctor_profile)