# patients/serializers.py
from rest_framework import serializers
from .models import Patient
from accounts.serializers import UserSerializer
from media.utils import cloud_thumbs

class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profile_picture_thumbs = serializers.SerializerMethodField()
    address = serializers.ReadOnlyField(source='user.get_full_address')

    class Meta:
        model = Patient
        fields = [
            "id", "user",
            "insurance_no", "occupation",
            "profile_picture", "profile_picture_thumbs",
            "address"
        ]
        read_only_fields = ["id", "user", "profile_picture", "address"]

    def get_profile_picture_thumbs(self, obj):
        if obj.profile_picture:
            return cloud_thumbs(
                obj.profile_picture,
                sizes={"small": (64, 64), "large": (400, 400)}
            )
        return None