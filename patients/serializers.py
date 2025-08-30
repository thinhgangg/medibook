from rest_framework import serializers
from .models import Patient
from accounts.serializers import UserSerializer  # Import UserSerializer từ accounts/serializers.py

class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer()  # Serialize thông tin của CustomUser (bao gồm full_name, email, v.v.)

    class Meta:
        model = Patient
        fields = ['id', 'user', 'dob', 'phone_number', 'gender', 'insurance_no']

