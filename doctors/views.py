from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, SAFE_METHODS
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta, date as date_cls
from dashboard.decorators import role_required  # Import decorator

from .models import Doctor, DoctorAvailability, DoctorDayOff
from .serializers import DoctorSerializer, DoctorAvailabilitySerializer, DoctorDayOffSerializer

# View profile bác sĩ với kiểm tra role
@role_required("DOCTOR")  # Chỉ bác sĩ mới có thể truy cập
def doctor_profile(request):
    # Logic của bạn ở đây (nếu có)
    return render(request, 'doctors/doctor-profile.html')  # Trả về profile bác sĩ

# View lịch bác sĩ (mở cho tất cả để xem trước)
def doctor_schedule(request):
    return render(request, 'doctors/doctor_schedule.html')  # Trả về trang lịch bác sĩ

class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer
    
    def get_permissions(self):
        # Cho phép ai cũng GET danh bạ bác sĩ; còn lại cần đăng nhập
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        qs = Doctor.objects.select_related("user", "specialty")
        if self.action in ("list", "retrieve"):
            qs = qs.filter(is_active=True)  # Công khai chỉ thấy bác sĩ active
        return qs

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
        PATCH /doctors/me/   -> cập nhật hồ sơ của chính mình
        """
        obj = get_object_or_404(Doctor, user=request.user)

        if request.method == 'GET':
            return Response(self.get_serializer(obj).data)

        # PATCH
        serializer = self.get_serializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)  # Chặn đổi user
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='slots')
    def slots(self, request, pk=None):
        """
        GET /doctors/{id}/slots/?date=YYYY-MM-DD
        Trả list slot trống (đã loại các lịch hẹn confirmed/pending).
        """
        from appointments.models import Appointment  # Tránh import vòng
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
        end_of_day = datetime.combine(target_date, datetime.max.time())
        tz = timezone.get_current_timezone()
        start_of_day = timezone.make_aware(start_of_day, tz)
        end_of_day = timezone.make_aware(end_of_day, tz)

        taken = doctor.appointments.exclude(status="CANCELLED") \
            .filter(start_at__lt=end_of_day, end_at__gt=start_of_day) \
            .values_list("start_at", "end_at")

        # Build danh sách slot
        now = timezone.now()
        busy = [(s, e) for s, e in taken]  # List of aware datetimes
        slots = []

        for av in avails:
            slot_len = timedelta(minutes=av.slot_minutes)
            cur = timezone.make_aware(datetime.combine(target_date, av.start_time), tz)
            limit = timezone.make_aware(datetime.combine(target_date, av.end_time), tz)

            while cur + slot_len <= limit:
                slot_start = cur
                slot_end = cur + slot_len

                # Loại slot quá khứ (nếu là hôm nay)
                if slot_end <= now:
                    cur += slot_len
                    continue

                # Check overlap với busy
                overlap = any((slot_start < b_end and slot_end > b_start) for b_start, b_end in busy)
                if not overlap:
                    slots.append({
                        "start_at": slot_start.isoformat(),
                        "end_at": slot_end.isoformat()
                    })
                cur += slot_len

        # Lấy day-off của ngày đó
        offs = doctor.day_offs.filter(date=target_date)
        # Nếu nghỉ cả ngày -> không có slot
        if offs.filter(start_time__isnull=True, end_time__isnull=True).exists():
            return Response([])

        # Biến day-off sang khoảng thời gian aware để kiểm tra overlap
        tz = timezone.get_current_timezone()
        off_intervals = []
        for off in offs:
            if off.start_time and off.end_time:
                off_start = timezone.make_aware(datetime.combine(target_date, off.start_time), tz)
                off_end = timezone.make_aware(datetime.combine(target_date, off.end_time), tz)
                off_intervals.append((off_start, off_end))

        # Trong vòng while tạo slot, thêm điều kiện loại bỏ nếu trùng interval nghỉ:
        overlap_off = any((slot_start < o_end and slot_end > o_start) for o_start, o_end in off_intervals)
        if not overlap and not overlap_off:
            slots.append({"start_at": slot_start.isoformat(), "end_at": slot_end.isoformat()})

        return Response(slots)

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_staff or u.is_superuser:
            base = DoctorAvailability.objects.all()
        elif hasattr(u, 'doctor_profile'):
            base = DoctorAvailability.objects.filter(doctor=u.doctor_profile)
        else:
            return DoctorAvailability.objects.none()

        wd = self.request.query_params.get("weekday")
        return base.filter(weekday=wd) if wd is not None else base

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới thiết lập lịch làm việc.")
        serializer.save(doctor=self.request.user.doctor_profile)

    def perform_update(self, serializer):
        if not hasattr(self.request.user, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới sửa lịch làm việc.")
        serializer.save(doctor=self.request.user.doctor_profile)

class DoctorDayOffViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorDayOffSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_staff or u.is_superuser:
            qs = DoctorDayOff.objects.all()
        elif hasattr(u, 'doctor_profile'):
            qs = DoctorDayOff.objects.filter(doctor=u.doctor_profile)
        else:
            return DoctorDayOff.objects.none()

        # Optional filter: ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
        p = self.request.query_params
        df = p.get('date_from')
        dt = p.get('date_to')
        if df:
            from datetime import date as date_cls
            try:
                qs = qs.filter(date__gte=date_cls.fromisoformat(df))
            except ValueError:
                pass
        if dt:
            from datetime import date as date_cls
            try:
                qs = qs.filter(date__lte=date_cls.fromisoformat(dt))
            except ValueError:
                pass
        return qs.order_by('date', 'start_time')

    def perform_create(self, serializer):
        u = self.request.user
        if not hasattr(u, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới tạo ngày nghỉ.")
        serializer.save(doctor=u.doctor_profile)

    def perform_update(self, serializer):
        u = self.request.user
        if not hasattr(u, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới sửa ngày nghỉ.")
        serializer.save(doctor=u.doctor_profile)