# doctors/serializers.py
from rest_framework import serializers
from .models import DoctorAvailability, DoctorDayOff, Doctor

class DoctorSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = Doctor
        fields = ['id', 'user_id', 'specialty', 'bio', 'hospital', 'gender', 'phone_number']
        read_only_fields = ['id', 'user_id', 'phone_number']

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ['id','weekday','start_time','end_time','slot_minutes','is_active']

    def validate(self, data):
        user = self.context['request'].user
        if not hasattr(user, 'doctor_profile'):
            raise serializers.ValidationError("Chỉ bác sĩ mới sửa lịch làm việc của mình.")
        doctor = user.doctor_profile

        weekday = data.get('weekday', getattr(self.instance, 'weekday', None))
        start   = data.get('start_time', getattr(self.instance, 'start_time', None))
        end     = data.get('end_time',   getattr(self.instance, 'end_time', None))

        if not weekday in range(7):
            raise serializers.ValidationError("weekday phải từ 0 (Mon) đến 6 (Sun).")
        if not start or not end or end <= start:
            raise serializers.ValidationError("end_time phải lớn hơn start_time.")

        qs = DoctorAvailability.objects.filter(doctor=doctor, weekday=weekday, is_active=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        # Overlap nếu: start < other_end và end > other_start
        if qs.filter(start_time__lt=end, end_time__gt=start).exists():
            raise serializers.ValidationError("Khung giờ bị chồng lấp với availability khác.")

        return data
    
class DoctorDayOffSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorDayOff
        fields = ['id', 'date', 'start_time', 'end_time', 'reason']

    def validate(self, data):
        s = data.get('start_time')
        e = data.get('end_time')
        # Cả hai null -> nghỉ cả ngày (ok)
        if (s is None) ^ (e is None):
            raise serializers.ValidationError("Nếu nghỉ theo khung giờ, cần có cả start_time và end_time.")
        if s and e and e <= s:
            raise serializers.ValidationError("end_time phải lớn hơn start_time.")
        return data