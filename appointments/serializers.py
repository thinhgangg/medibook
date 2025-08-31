from rest_framework import serializers
from .models import Appointment
from doctors.models import Doctor  # <- import để dùng queryset

class AppointmentSerializer(serializers.ModelSerializer):
    doctor_id  = serializers.IntegerField(source="doctor.id", read_only=True)
    patient_id = serializers.IntegerField(source="patient.id", read_only=True)

    class Meta:
        model  = Appointment
        fields = ["id", "doctor_id", "patient_id", "start_at", "end_at", "reason", "status", "created_at"]
        read_only_fields = ["id", "doctor_id", "patient_id", "status", "created_at"]

class AppointmentCreateSerializer(serializers.ModelSerializer):
    # CẤP queryset NGAY TẠI ĐÂY
    doctor = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all())

    class Meta:
        model  = Appointment
        fields = ["doctor", "start_at", "end_at", "reason"]

    def validate(self, data):
        from django.utils import timezone
        start = data["start_at"]
        end   = data["end_at"]
        if end <= start:
            raise serializers.ValidationError("end_at phải lớn hơn start_at.")
        if start < timezone.now():
            raise serializers.ValidationError("Không được đặt lịch trong quá khứ.")

        doctor = data["doctor"]
        qs = doctor.appointments.exclude(status=Appointment.Status.CANCELLED)
        if qs.filter(start_at__lt=end, end_at__gt=start).exists():
            raise serializers.ValidationError("Khung giờ đã có người đặt. Vui lòng chọn giờ khác.")
        return data
