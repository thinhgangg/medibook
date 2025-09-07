# patients/serializers.py
from rest_framework import serializers
from .models import Patient
from accounts.serializers import UserSerializer
from media.utils import cloud_thumbs

class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    profile_picture_thumbs = serializers.SerializerMethodField()
    dob = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(source="user.address", required=False, allow_blank=True, allow_null=True)
    insurance_no = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    profile_picture_thumbs = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id", "user", "phone_number",
            "gender", "dob", 
            "insurance_no", "address",
            "profile_picture", "profile_picture_thumbs"
        ]
        read_only_fields = ["id", "user", "phone_number", "profile_picture"]

    def get_profile_picture_thumbs(self, obj):
        if obj.profile_picture:
            return cloud_thumbs(
                obj.profile_picture, 
                sizes={"small": (64, 64), "large": (400, 400)}
            )
        return None