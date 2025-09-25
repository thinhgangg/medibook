from datetime import timedelta, date as date_cls

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Appointment, AppointmentImage
from .serializers import (
    AppointmentSerializer,
    AppointmentCreateSerializer,
    AppointmentImageSerializer,
    _ensure_within_availability_and_grid,
)

class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def _normalize_dt(self, dt):
        if dt is None:
            return None
        return timezone.make_aware(dt, timezone.get_current_timezone()) if timezone.is_naive(dt) else dt

    # ---------------- Queryset & Serializer ----------------
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

        # Lọc theo ngày (YYYY-MM-DD) – dựa vào start_at__date
        try:
            if date_from:
                df = date_cls.fromisoformat(date_from)
                qs = qs.filter(start_at__date__gte=df)
        except ValueError:
            pass
        try:
            if date_to:
                dt = date_cls.fromisoformat(date_to)
                qs = qs.filter(start_at__date__lte=dt)
        except ValueError:
            pass

        return qs.order_by("-start_at")

    def get_serializer_class(self):
        return AppointmentCreateSerializer if self.action == "create" else AppointmentSerializer

    # ---------------- Create ----------------
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

            self._created_instance = serializer.save(patient=user.patient_profile, start_at=start, end_at=end, status=Appointment.Status.PENDING)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        self.perform_create(ser)
        detail = AppointmentSerializer(self._created_instance).data
        headers = self.get_success_headers(ser.data)
        return Response(detail, status=status.HTTP_201_CREATED, headers=headers)

    # ---------------- Actions: confirm / complete / cancel / reschedule ----------------
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

            send_appointment_confirmation(appt)

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

            send_appointment_cancellation(appt)

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

        # Chỉ đc dời khi chưa COMPLETED/CANCELLED
        if appt.status in (Appointment.Status.COMPLETED, Appointment.Status.CANCELLED):
            return Response({"detail": "Không thể dời lịch ở trạng thái hiện tại."}, status=400)

        # Quyền: bệnh nhân/bác sĩ của lịch (hoặc admin)
        u = request.user
        is_party = (
            (hasattr(u, "patient_profile") and appt.patient_id == u.patient_profile.id)
            or (hasattr(u, "doctor_profile") and appt.doctor_id == u.doctor_profile.id)
            or u.is_staff
            or u.is_superuser
        )
        if not is_party:
            return Response({"detail": "Không có quyền"}, status=403)

        # Phải nằm trong availability & khớp lưới slot
        _ensure_within_availability_and_grid(appt.doctor, new_start, new_end)

        buffer = timedelta(minutes=getattr(settings, "APPOINTMENT_BUFFER_MINUTES", 0))

        with transaction.atomic():
            # Khoá & kiểm tra chồng lấp (có buffer), loại trừ chính cuộc hẹn này
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
            appt.status = Appointment.Status.PENDING
            appt.save()

        return Response(AppointmentSerializer(appt).data)
    
class AppointmentImageViewSet(viewsets.ModelViewSet):
    queryset = AppointmentImage.objects.all()
    serializer_class = AppointmentImageSerializer
    permission_classes = [IsAuthenticated]
    
def send_appointment_confirmation(appointment):
    subject = 'Xác nhận lịch hẹn khám bệnh'
    message = f"Lịch hẹn của bạn với bác sĩ {appointment.doctor.user.full_name} đã được xác nhận.\nThời gian: {appointment.start_at.strftime('%H:%M %d-%m-%Y')}\nChúc bạn sức khỏe tốt!"
    recipient = appointment.patient.user.email

    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient])
        print(f"Đã gửi email xác nhận lịch hẹn đến {recipient}")
    except Exception as e:
        print(f"Lỗi khi gửi email: {e}")

def send_appointment_cancellation(appointment):
    subject = 'Thông báo hủy lịch hẹn khám bệnh'
    message = f"Lịch hẹn của bạn với bác sĩ {appointment.doctor.user.full_name} đã bị hủy.\nThời gian đã được lên kế hoạch trước: {appointment.start_at.strftime('%H:%M %d-%m-%Y')}\nChúng tôi xin lỗi về sự bất tiện này."
    recipient = appointment.patient.user.email

    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient])
        print(f"Đã gửi email thông báo hủy lịch đến {recipient}")
    except Exception as e:
        print(f"Lỗi khi gửi email: {e}")
