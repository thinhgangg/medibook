# patients/serializers.py
from rest_framework import serializers
from .models import Patient
from accounts.serializers import UserSerializer

class PatientSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = Patient
        fields = ['id', 'user_id', 'dob', 'gender', 'insurance_no', 'phone_number']
        read_only_fields = ['id', 'user_id', 'phone_number']
