from rest_framework import serializers
from .models import Doctor
from accounts.serializers import UserSerializer  # Import UserSerializer từ accounts/serializers.py

class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer()  # Serialize thông tin của `CustomUser` (bao gồm full_name, email, v.v.)

    class Meta:
        model = Doctor
        fields = ['id', 'user', 'specialty', 'bio', 'hospital', 'phone_number', 'gender']
