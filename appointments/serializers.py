from django.utils import timezone
from rest_framework import serializers
from .models import Appointment, AppointmentImage
from doctors.models import Doctor

class AppointmentImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentImage
        fields = ["id", "appointment", "image", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]
class AppointmentSerializer(serializers.ModelSerializer):
    doctor_id  = serializers.IntegerField(source="doctor.id", read_only=True)
    patient_id = serializers.IntegerField(source="patient.id", read_only=True)
    images = AppointmentImageSerializer(many=True, read_only=True)

    class Meta:
        model  = Appointment
        fields = ["id", "doctor_id", "patient_id", "start_at", "end_at", "note", "status", "created_at", "images"]
        read_only_fields = ["id", "doctor_id", "patient_id", "status", "created_at"]

def _ensure_within_availability_and_grid(doctor, start_at, end_at):
    tz = timezone.get_current_timezone()

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

    match = None
    for av in avails:
        if av.start_time <= s_time and av.end_time >= e_time:
            match = av
            break
    if not match:
        raise serializers.ValidationError("Khung giờ nằm ngoài giờ làm việc của bác sĩ.")

    slot = match.slot_minutes

    dur_min = int((e - s).total_seconds() // 60)
    if dur_min <= 0 or dur_min % slot != 0:
        raise serializers.ValidationError(f"Độ dài lịch phải là bội số của {slot} phút.")

    def _mins(t): return t.hour * 60 + t.minute
    offset = _mins(s_time) - _mins(match.start_time)
    if offset % slot != 0:
        raise serializers.ValidationError(f"Giờ bắt đầu phải khớp lưới {slot} phút từ {match.start_time}.")
    
    offs = doctor.day_offs.filter(date=s.date())
    if offs.filter(start_time__isnull=True, end_time__isnull=True).exists():
        raise serializers.ValidationError("Bác sĩ nghỉ cả ngày.")

    def _mins(t): return t.hour * 60 + t.minute
    s_m = _mins(s.time()); e_m = _mins(e.time())
    for off in offs:
        if off.start_time and off.end_time:
            o_s = _mins(off.start_time); o_e = _mins(off.end_time)
            if s_m < o_e and e_m > o_s:
                raise serializers.ValidationError("Khung giờ trùng với thời gian bác sĩ nghỉ.")

class AppointmentCreateSerializer(serializers.ModelSerializer):
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())

    class Meta:
        model  = Appointment
        fields = ["doctor", "start_at", "end_at", "note"]

    def validate(self, data):
        start = data["start_at"]
        end   = data["end_at"]
        if end <= start:
            raise serializers.ValidationError("end_at phải lớn hơn start_at.")
        if start < timezone.now():
            raise serializers.ValidationError("Không được đặt lịch trong quá khứ.")

        doctor = data["doctor"]
        if not doctor.is_active:
            raise serializers.ValidationError("Bác sĩ hiện không nhận lịch (inactive).")
        if not doctor.user.is_active:
            raise serializers.ValidationError("Tài khoản bác sĩ đang bị khóa.")

        _ensure_within_availability_and_grid(doctor, start, end)

        qs = doctor.appointments.exclude(status=Appointment.Status.CANCELLED)
        if qs.filter(start_at__lt=end, end_at__gt=start).exists():
            raise serializers.ValidationError("Khung giờ đã có người đặt. Vui lòng chọn giờ khác.")

        return data
