# doctors/serializers.py
from rest_framework import serializers
from .models import Doctor, DoctorAvailability

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