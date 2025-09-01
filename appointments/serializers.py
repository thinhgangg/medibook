# appointments/serializers.py
from django.utils import timezone
from rest_framework import serializers
from .models import Appointment
from doctors.models import Doctor  # dùng queryset

class AppointmentSerializer(serializers.ModelSerializer):
    doctor_id  = serializers.IntegerField(source="doctor.id", read_only=True)
    patient_id = serializers.IntegerField(source="patient.id", read_only=True)

    class Meta:
        model  = Appointment
        fields = ["id", "doctor_id", "patient_id", "start_at", "end_at", "reason", "status", "created_at"]
        read_only_fields = ["id", "doctor_id", "patient_id", "status", "created_at"]


# ---------- helper kiểm tra availability & lưới slot ----------
def _ensure_within_availability_and_grid(doctor, start_at, end_at):
    """
    - start/end cùng 1 ngày (local)
    - Nằm trong ít nhất 1 availability (weekday & is_active & time range)
    - Thời lượng là bội số của slot_minutes của availability khớp
    - Giờ bắt đầu khớp lưới slot từ start_time của availability
    """
    tz = timezone.get_current_timezone()

    # đảm bảo aware theo TZ, rồi convert về localtime
    s = timezone.localtime(start_at, tz) if timezone.is_aware(start_at) else start_at
    e = timezone.localtime(end_at,   tz) if timezone.is_aware(end_at)   else end_at

    if s.date() != e.date():
        raise serializers.ValidationError("Lịch phải bắt đầu/kết thúc trong cùng một ngày.")

    weekday = s.weekday()
    avails = doctor.availabilities.filter(weekday=weekday, is_active=True)
    if not avails.exists():
        raise serializers.ValidationError("Ngày này bác sĩ không làm việc.")

    s_time = s.time()
    e_time = e.time()

    # tìm availability bao phủ khung giờ
    match = None
    for av in avails:
        if av.start_time <= s_time and av.end_time >= e_time:
            match = av
            break
    if not match:
        raise serializers.ValidationError("Khung giờ nằm ngoài giờ làm việc của bác sĩ.")

    slot = match.slot_minutes

    # độ dài phải là bội số slot
    dur_min = int((e - s).total_seconds() // 60)
    if dur_min <= 0 or dur_min % slot != 0:
        raise serializers.ValidationError(f"Độ dài lịch phải là bội số của {slot} phút.")

    # bắt đầu phải khớp lưới slot từ start_time của ca
    def _mins(t): return t.hour * 60 + t.minute
    offset = _mins(s_time) - _mins(match.start_time)
    if offset % slot != 0:
        raise serializers.ValidationError(f"Giờ bắt đầu phải khớp lưới {slot} phút từ {match.start_time}.")


class AppointmentCreateSerializer(serializers.ModelSerializer):
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())

    class Meta:
        model  = Appointment
        fields = ["doctor", "start_at", "end_at", "reason"]

    def validate(self, data):
        start = data["start_at"]
        end   = data["end_at"]
        if end <= start:
            raise serializers.ValidationError("end_at phải lớn hơn start_at.")
        if start < timezone.now():
            raise serializers.ValidationError("Không được đặt lịch trong quá khứ.")

        doctor = data["doctor"]

        # 1) Nằm trong availability + đúng lưới slot
        _ensure_within_availability_and_grid(doctor, start, end)

        # 2) Không trùng lịch (check mềm ở serializer; check cứng ở view với select_for_update)
        qs = doctor.appointments.exclude(status=Appointment.Status.CANCELLED)
        if qs.filter(start_at__lt=end, end_at__gt=start).exists():
            raise serializers.ValidationError("Khung giờ đã có người đặt. Vui lòng chọn giờ khác.")

        return data
