from datetime import datetime, timedelta, date as date_cls
from django.shortcuts import get_object_or_404, render, redirect
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, SAFE_METHODS
from rest_framework.response import Response

from .models import Doctor, DoctorAvailability, DoctorDayOff
from .serializers import DoctorSerializer, DoctorAvailabilitySerializer, DoctorDayOffSerializer

# -------------- Views for Doctor Profile and Schedule ------------------

# Doctor Profile Page (for viewing and editing)
@login_required
def doctor_profile(request, pk=None):
    # Debug log to verify user and role
    print(f"User: {request.user}, Role: {getattr(request.user, 'role', 'No role attribute')}, Is authenticated: {request.user.is_authenticated}")
    # Kiểm tra quyền: Chỉ DOCTOR
    if not hasattr(request.user, 'role') or request.user.role != 'DOCTOR':
        return HttpResponseForbidden("Xin lỗi, bạn không có quyền truy cập trang này. Chỉ có bác sĩ mới được phép xem trang này.")

    if pk is None:
        # Không có pk: Giả định profile của chính user
        try:
            doctor = get_object_or_404(Doctor, user=request.user)
        except:
            return render(request, 'doctors/doctor_profile.html', {
                'doctor': None,
                'error_message': 'Hồ sơ bác sĩ của bạn chưa được tạo. Vui lòng liên hệ admin để hỗ trợ.'
            })
    else:
        # Có pk: Lấy doctor theo pk, chỉ DOCTOR của chính profile
        doctor = get_object_or_404(Doctor, pk=pk)
        if doctor.user != request.user:
            return HttpResponseForbidden("Bạn chỉ có thể xem hồ sơ của chính mình.")

    # Lấy availabilities để hiển thị lịch
    availabilities = DoctorAvailability.objects.filter(doctor=doctor)
    return render(request, 'doctors/doctor_profile.html', {'doctor': doctor, 'availabilities': availabilities})

# Doctor Schedule Page (for viewing and editing)
@login_required
def doctor_schedule(request):
    # Debug log to verify user and role
    print(f"User: {request.user}, Role: {getattr(request.user, 'role', 'No role attribute')}, Is authenticated: {request.user.is_authenticated}")
    # Kiểm tra quyền: Chỉ DOCTOR
    if request.user.role not in ['DOCTOR', 'ADMIN']:
        return HttpResponseForbidden("Bạn không có quyền xem trang này.")

    doctor = get_object_or_404(Doctor, user=request.user)
    return render(request, 'doctors/doctor_schedule.html', {'doctor': doctor})

# -------------- API for Doctor Profile and Schedule ------------------

class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer

    def get_permissions(self):
        # Allow GET requests without authentication; other methods need authentication
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Doctor.objects.select_related("user", "specialty")
        if self.action in ("list", "retrieve"):
            qs = qs.filter(is_active=True)  # Only active doctors are public
        return qs

    def perform_create(self, serializer):
        if Doctor.objects.filter(user=self.request.user).exists():
            raise PermissionDenied("Your doctor profile already exists.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)  # Lock to the current user

    @action(detail=False, methods=["get", "patch"], url_path="me", permission_classes=[IsAuthenticated])
    def me(self, request):
        """GET /api/doctors/me/ and PATCH /api/doctors/me/ for editing doctor profile"""
        obj = get_object_or_404(Doctor, user=request.user)
        if request.method == "GET":
            return Response(self.get_serializer(obj).data)

        serializer = self.get_serializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="slots")
    def slots(self, request, pk=None):
        """GET /api/doctors/{id}/slots/?date=YYYY-MM-DD for available slots"""
        from appointments.models import Appointment  # Prevent circular import

        doctor = self.get_object()
        date_str = request.query_params.get("date")
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

        tz = timezone.get_current_timezone()
        start_of_day = timezone.make_aware(datetime.combine(target_date, datetime.min.time()), tz)
        end_of_day = timezone.make_aware(datetime.combine(target_date, datetime.max.time()), tz)

        taken = doctor.appointments.exclude(status="CANCELLED").filter(start_at__lt=end_of_day, end_at__gt=start_of_day).values_list("start_at", "end_at")
        busy = [(s, e) for s, e in taken]  # aware datetimes

        offs = doctor.day_offs.filter(date=target_date)
        if offs.filter(start_time__isnull=True, end_time__isnull=True).exists():
            return Response([])

        off_intervals = []
        for off in offs:
            if off.start_time and off.end_time:
                off_start = timezone.make_aware(datetime.combine(target_date, off.start_time), tz)
                off_end = timezone.make_aware(datetime.combine(target_date, off.end_time), tz)
                off_intervals.append((off_start, off_end))

        now = timezone.now()
        slots = []

        for av in avails:
            slot_len = timedelta(minutes=av.slot_minutes or 15)
            cur = timezone.make_aware(datetime.combine(target_date, av.start_time), tz)
            limit = timezone.make_aware(datetime.combine(target_date, av.end_time), tz)

            while cur + slot_len <= limit:
                slot_start = cur
                slot_end = cur + slot_len

                if slot_end <= now:
                    cur += slot_len
                    continue

                overlap_appt = any(slot_start < b_end and slot_end > b_start
                                 for b_start, b_end in busy)
                overlap_off = any(slot_start < o_end and slot_end > o_start
                                for o_start, o_end in off_intervals)

                if not overlap_appt and not overlap_off:
                    slots.append({
                        "start_at": slot_start.isoformat(),
                        "end_at": slot_end.isoformat(),
                    })

                cur += slot_len

        slots.sort(key=lambda x: x["start_at"])
        return Response(slots)


class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_staff or u.is_superuser:
            base = DoctorAvailability.objects.all()
        elif hasattr(u, "doctor_profile"):
            base = DoctorAvailability.objects.filter(doctor=u.doctor_profile)
        else:
            return DoctorAvailability.objects.none()

        wd = self.request.query_params.get("weekday")
        return base.filter(weekday=wd) if wd is not None else base

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "doctor_profile"):
            raise PermissionDenied("Only doctors can set their availability.")
        serializer.save(doctor=self.request.user.doctor_profile)

    def perform_update(self, serializer):
        if not hasattr(self.request.user, "doctor_profile"):
            raise PermissionDenied("Only doctors can update their availability.")
        serializer.save(doctor=self.request.user.doctor_profile)


class DoctorDayOffViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorDayOffSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_staff or u.is_superuser:
            qs = DoctorDayOff.objects.all()
        elif hasattr(u, "doctor_profile"):
            qs = DoctorDayOff.objects.filter(doctor=u.doctor_profile)
        else:
            return DoctorDayOff.objects.none()

        # optional filter: ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
        p = self.request.query_params
        df = p.get("date_from")
        dt = p.get("date_to")
        if df:
            try:
                qs = qs.filter(date__gte=date_cls.fromisoformat(df))
            except ValueError:
                pass
        if dt:
            try:
                qs = qs.filter(date__lte=date_cls.fromisoformat(dt))
            except ValueError:
                pass
        return qs.order_by("date", "start_time")

    def perform_create(self, serializer):
        u = self.request.user
        if not hasattr(u, "doctor_profile"):
            raise PermissionDenied("Only doctors can set days off.")
        serializer.save(doctor=u.doctor_profile)

    def perform_update(self, serializer):
        u = self.request.user
        if not hasattr(u, "doctor_profile"):
            raise PermissionDenied("Only doctors can update days off.")
        serializer.save(doctor=u.doctor_profile)