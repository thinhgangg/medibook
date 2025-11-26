# dashboard/admin_serializers.py
from rest_framework import serializers
from accounts.models import CustomUser
from doctors.models import Doctor, Specialty, DoctorReview
from patients.models import Patient
from appointments.models import Appointment

class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'full_name', 'id_number', 'dob', 'phone_number', 'role', 
                 'is_active', 'date_joined', 'last_login',
                 'address_detail', 'ward', 'district', 'city',]
        read_only_fields = ['id', 'date_joined', 'last_login']

class AdminDoctorSerializer(serializers.ModelSerializer):
    user = AdminUserSerializer(read_only=True)
    specialty_name = serializers.CharField(source='specialty.name', read_only=True)
    experience_years = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Doctor
        fields = ['id', 'user', 'specialty_name', 'bio', 'experience_detail', 'experience_years', 
                 'average_rating', 'is_active', 'is_featured', 'started_practice', 'room_number',]

class AdminAppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.user.full_name', read_only=True)
    doctor_email = serializers.CharField(source='doctor.user.email', read_only=True)
    patient_email = serializers.CharField(source='patient.user.email', read_only=True)
    
    class Meta:
        model = Appointment
        fields = ['id', 'doctor_name', 'patient_name', 'doctor_email', 'patient_email',
                 'start_at', 'end_at', 'status', 'note', 'created_at']

class AdminSpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = ['id', 'name', 'description', 'is_active', 'specialty_picture', 'slug']
        read_only_fields = ['slug']

class AdminReviewSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.user.full_name', read_only=True)
    appointment_date = serializers.DateTimeField(source='appointment.start_at', read_only=True)
    
    class Meta:
        model = DoctorReview
        fields = ['id', 'doctor_name', 'patient_name', 'appointment_date',
                 'stars', 'comment', 'is_active', 'created_at', 'updated_at']