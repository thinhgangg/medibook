# doctors/serializers.py
from rest_framework import serializers
from .models import Doctor, DoctorAvailability, DoctorDayOff, Specialty
from accounts.serializers import UserSerializer
from appointments.models import Appointment
from doctors.models import DoctorReview
from media.utils import cloud_thumbs

class SpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = "__all__"

class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    specialty = SpecialtySerializer(read_only=True)
    
    specialty_slug = serializers.SlugRelatedField(
        source="specialty",
        slug_field="slug",
        queryset=Specialty.objects.filter(is_active=True),
        write_only=True,
        required=False,
        allow_null=True,
    )

    address = serializers.ReadOnlyField(source='user.get_full_address')

    profile_picture = serializers.ImageField(required=False, allow_null=True)
    profile_picture_thumbs = serializers.SerializerMethodField()

    started_practice = serializers.DateField(required=False, allow_null=True)
    experience_detail = serializers.CharField(required=False, allow_blank=True)

    experience_years = serializers.SerializerMethodField()

    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            "id", "slug", "user", 
            "specialty", "specialty_slug",
            "bio", "started_practice", "experience_years", "experience_detail",
            "average_rating",
            "profile_picture", "profile_picture_thumbs", 
            "address", "is_active"
        ]
        read_only_fields = ["id", "slug", "user", "profile_picture", "experience_years", "average_rating"]

    def get_profile_picture_thumbs(self, obj):
        if obj.profile_picture:
            return cloud_thumbs(
                obj.profile_picture,
                sizes={"small": (64, 64), "large": (400, 400)}
            )
        return None
    
    def update(self, instance, validated_data):
        if validated_data.pop("remove_profile_picture", False):
            instance.profile_picture = None
        return super().update(instance, validated_data)

    def get_experience_years(self, obj):
        return obj.experience_years

    def get_average_rating(self, obj):
        avg = getattr(obj, 'average_rating_db', None)
        if avg is None:
            avg = obj.average_rating
        return round(avg, 1) if avg else 0
    
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
    
class DoctorReviewSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="appointment.patient.user.full_name", read_only=True
    )
    created_at = serializers.DateTimeField(
        source="appointment.end_at", read_only=True
    )
    class Meta:
        model = DoctorReview
        fields = ['id', 'stars', 'comment', 'patient_name', 'created_at']

    def validate(self, data):
        appointment = self.context['appointment']
        if appointment.status != Appointment.Status.COMPLETED:
            raise serializers.ValidationError("Cuộc hẹn phải hoàn thành mới có thể đánh giá.")
        
        if hasattr(appointment, 'review'):
            raise serializers.ValidationError("Cuộc hẹn này đã có đánh giá.")
        return data