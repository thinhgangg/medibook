from datetime import timedelta, date as date_cls

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Appointment
from .serializers import (
    AppointmentSerializer,
    AppointmentCreateSerializer,
    _ensure_within_availability_and_grid,
)

# ===================== PAGES (TEMPLATE VIEWS) =====================

def appointment_view(request):
    return render(request, "appointments/appointment.html")

def appointment_invoice_view(request):
    return render(request, "appointments/appointment-invoice.html")

def appointment_list_view(request):
    return render(request, "appointments/appointment-list.html")

def appointment_success_view(request):
    return render(request, "appointments/appointment-success.html")

def search(request):
    return render(request, "appointments/search.html")

# ⭐ Trang đặt lịch mới (HTML/CSS/JS thuần).
#   Nếu có truyền doctor_slug/doctor_id thì bạn có thể load hồ sơ để bơm vào context.
def booking_youmed(request, doctor_slug=None, doctor_id=None):
    ctx = {}
    # ví dụ nạp doctor nếu bạn có model bác sĩ:
    # from doctors.models import Doctor
    # if doctor_slug:
    #     ctx["doctor"] = get_object_or_404(Doctor, slug=doctor_slug)
    # elif doctor_id:
    #     ctx["doctor"] = get_object_or_404(Doctor, pk=doctor_id)

    # ✅ ĐỔI ĐÚNG TÊN TEMPLATE MỚI
    return render(request, "appointments/appointment-booking.html", ctx)

# ----- Trang mới: bệnh nhân xem lịch đã đặt (admin cũng vào được) -----
@login_required
def patient_appointments_page(request):
    """Trang bệnh nhân: lịch đã đặt"""
    user = request.user
    is_admin = user.is_staff or user.is_superuser

    if not (hasattr(user, "patient_profile") or is_admin):
        raise DjangoPermissionDenied("Chỉ bệnh nhân (hoặc admin) mới được xem trang này.")

    qs = Appointment.objects.select_related("doctor", "patient")
    if not is_admin:
        qs = qs.filter(patient=user.patient_profile)
    qs = qs.order_by("-start_at")

    # filter nhẹ theo query string (status, date_from, date_to)
    status_q = request.GET.get("status")
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
    if status_q:
        qs = qs.filter(status=status_q)
    try:
        if date_from:
            qs = qs.filter(start_at__date__gte=date_cls.fromisoformat(date_from))
    except ValueError:
        pass
    try:
        if date_to:
            qs = qs.filter(start_at__date__lte=date_cls.fromisoformat(date_to))
    except ValueError:
        pass

    ctx = {"appointments": qs}
    return render(request, "appointments/patient_appointments.html", ctx)

# ----- Trang mới: bác sĩ quản lý ca khám / giờ làm / ngày nghỉ (admin cũng vào được) -----
@login_required
def doctor_appointments_page(request):
    """Trang bác sĩ: ca khám + giờ làm + ngày nghỉ"""
    user = request.user
    is_admin = user.is_staff or user.is_superuser

    if not (hasattr(user, "doctor_profile") or is_admin):
        raise DjangoPermissionDenied("Chỉ bác sĩ (hoặc admin) mới được xem trang này.")

    appts = Appointment.objects.select_related("doctor", "patient")
    if not is_admin:
        appts = appts.filter(doctor=user.doctor_profile)
    appts = appts.order_by("start_at")

    # filter nhẹ theo query string
    status_q = request.GET.get("status")
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
    if status_q:
        appts = appts.filter(status=status_q)
    try:
        if date_from:
            appts = appts.filter(start_at__date__gte=date_cls.fromisoformat(date_from))
    except ValueError:
        pass
    try:
        if date_to:
            appts = appts.filter(start_at__date__lte=date_cls.fromisoformat(date_to))
    except ValueError:
        pass

    # working_hours & timeoffs:
    # - Bác sĩ thật sự: nạp dữ liệu để chỉnh.
    # - Admin: để rỗng (hoặc bạn tự xây trang quản trị riêng).
    working_hours, timeoffs = [], []
    if not is_admin:
        try:
            from .models import WorkingHour, TimeOff  # nếu chưa có models này, sẽ vào except
            working_hours = (
                WorkingHour.objects.filter(doctor=user.doctor_profile).order_by("weekday")
            )
            timeoffs = (
                TimeOff.objects.filter(doctor=user.doctor_profile).order_by("-date")
            )
        except Exception:
            pass

    ctx = {
        "appointments": appts,
        "working_hours": working_hours,
        "timeoffs": timeoffs,
    }
    return render(request, "appointments/doctor_appointments.html", ctx)

# ===================== API (DRF VIEWSET) =====================

class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def _normalize_dt(self, dt):
        if dt is None:
            return None
        return timezone.make_aware(dt, timezone.get_current_timezone()) if timezone.is_naive(dt) else dt

    # ---------- Queryset & Serializer ----------
    def get_queryset(self):
        user = self.request.user
        base = Appointment.objects.select_related("doctor", "patient")

        # Quyền xem
        if user.is_staff or user.is_superuser:
            qs = base
        elif hasattr(user, "doctor_profile"):
            qs = base.filter(doctor=user.doctor_profile)
        elif hasattr(user, "patient_profile"):
            qs = base.filter(patient=user.patient_profile)
        else:
            return Appointment.objects.none()

        # ----- Filters -----
        p = self.request.query_params
        status_q = p.get("status")
        doctor_id = p.get("doctor_id")
        patient_id = p.get("patient_id")
        date_from = p.get("date_from")
        date_to = p.get("date_to")

        if status_q:
            qs = qs.filter(status=status_q)
        if doctor_id and doctor_id.isdigit():
            qs = qs.filter(doctor_id=int(doctor_id))
        if patient_id and patient_id.isdigit():
            qs = qs.filter(patient_id=int(patient_id))

        # Lọc theo ngày (YYYY-MM-DD)
        try:
            if date_from:
                qs = qs.filter(start_at__date__gte=date_cls.fromisoformat(date_from))
        except ValueError:
            pass
        try:
            if date_to:
                qs = qs.filter(start_at__date__lte=date_cls.fromisoformat(date_to))
        except ValueError:
            pass

        return qs.order_by("-start_at")

    def get_serializer_class(self):
        return AppointmentCreateSerializer if self.action == "create" else AppointmentSerializer

    # ---------- Create ----------
    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, "patient_profile"):
            raise PermissionDenied("Chỉ bệnh nhân mới được đặt lịch.")

        start = self._normalize_dt(serializer.validated_data["start_at"])
        end = self._normalize_dt(serializer.validated_data["end_at"])
        doctor = serializer.validated_data["doctor"]

        if end <= start:
            raise ValidationError("end_at phải lớn hơn start_at.")
        if start < timezone.now():
            raise ValidationError("Không được đặt lịch trong quá khứ.")

        buffer = timedelta(minutes=getattr(settings, "APPOINTMENT_BUFFER_MINUTES", 0))

        with transaction.atomic():
            clash = (
                Appointment.objects.select_for_update()
                .filter(doctor=doctor)
                .exclude(status=Appointment.Status.CANCELLED)
                .filter(start_at__lt=end + buffer, end_at__gt=start - buffer)
                .exists()
            )
            if clash:
                raise ValidationError(
                    f"Khung giờ đã bận (bao gồm buffer {buffer.seconds // 60} phút)."
                )

            self._created_instance = serializer.save(
                patient=user.patient_profile, start_at=start, end_at=end
            )

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        self.perform_create(ser)
        detail = AppointmentSerializer(self._created_instance).data
        headers = self.get_success_headers(ser.data)
        return Response(detail, status=status.HTTP_201_CREATED, headers=headers)

    # ---------- Actions ----------
    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        if not hasattr(request.user, "doctor_profile") or appt.doctor_id != request.user.doctor_profile.id:
            return Response({"detail": "Chỉ bác sĩ của lịch được xác nhận."}, status=403)
        if appt.status in (Appointment.Status.CANCELLED, Appointment.Status.COMPLETED):
            return Response({"detail": "Không thể xác nhận ở trạng thái hiện tại."}, status=400)
        if appt.status != Appointment.Status.CONFIRMED:
            appt.status = Appointment.Status.CONFIRMED
            appt.save()
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        if not hasattr(request.user, "doctor_profile") or appt.doctor_id != request.user.doctor_profile.id:
            return Response({"detail": "Chỉ bác sĩ của lịch được đánh dấu hoàn tất."}, status=403)
        if appt.status == Appointment.Status.CANCELLED:
            return Response({"detail": "Lịch đã bị hủy."}, status=400)
        if appt.start_at > timezone.now():
            return Response({"detail": "Chưa tới giờ khám, không thể hoàn tất."}, status=400)
        if appt.status != Appointment.Status.COMPLETED:
            appt.status = Appointment.Status.COMPLETED
            appt.save()
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appt = get_object_or_404(self.get_queryset(), pk=pk)
        u = request.user

        is_party = (
            (hasattr(u, "patient_profile") and appt.patient_id == u.patient_profile.id)
            or (hasattr(u, "doctor_profile") and appt.doctor_id == u.doctor_profile.id)
            or u.is_staff
            or u.is_superuser
        )
        if not is_party:
            return Response({"detail": "Không có quyền hủy."}, status=403)

        if appt.status == Appointment.Status.COMPLETED:
            return Response({"detail": "Không thể hủy lịch đã hoàn tất."}, status=400)
        if appt.start_at <= timezone.now():
            return Response({"detail": "Không thể hủy vì lịch đã quá giờ bắt đầu."}, status=400)

        if appt.status != Appointment.Status.CANCELLED:
            appt.status = Appointment.Status.CANCELLED
            appt.save()
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=["post"])
    def reschedule(self, request, pk=None):
        appt = get_object_or_404(self.get_queryset(), pk=pk)

        start = request.data.get("start_at")
        end = request.data.get("end_at")
        if not start or not end:
            return Response({"detail": "Thiếu start_at/end_at"}, status=400)

        new_start = self._normalize_dt(parse_datetime(start))
        new_end = self._normalize_dt(parse_datetime(end))
        if not new_start or not new_end or new_end <= new_start:
            return Response({"detail": "Thời gian không hợp lệ"}, status=400)
        if new_start < timezone.now():
            return Response({"detail": "Không được dời lịch vào thời điểm quá khứ."}, status=400)

        u = request.user
        is_party = (
            (hasattr(u, "patient_profile") and appt.patient_id == u.patient_profile.id)
            or (hasattr(u, "doctor_profile") and appt.doctor_id == u.doctor_profile.id)
            or u.is_staff
            or u.is_superuser
        )
        if not is_party:
            return Response({"detail": "Không có quyền"}, status=403)

        _ensure_within_availability_and_grid(appt.doctor, new_start, new_end)

        buffer = timedelta(minutes=getattr(settings, "APPOINTMENT_BUFFER_MINUTES", 0))

        with transaction.atomic():
            clash = (
                Appointment.objects.select_for_update()
                .filter(doctor=appt.doctor)
                .exclude(pk=appt.pk)
                .exclude(status=Appointment.Status.CANCELLED)
                .filter(start_at__lt=new_end + buffer, end_at__gt=new_start - buffer)
                .exists()
            )
            if clash:
                return Response(
                    {"detail": f"Khung giờ đã bận (bao gồm buffer {buffer.seconds // 60} phút)."},
                    status=400,
                )

            appt.start_at = new_start
            appt.end_at = new_end
            appt.status = Appointment.Status.PENDING  # dời -> chờ xác nhận
            appt.save()

        return Response(AppointmentSerializer(appt).data)
