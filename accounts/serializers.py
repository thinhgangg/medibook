from rest_framework import serializers
from accounts.models import CustomUser
from django.contrib.auth import authenticate


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if user is None:
            raise serializers.ValidationError("Email hoặc mật khẩu không đúng")
        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        fields = [
            "id", "email", "full_name", "phone_number",
            "dob", "gender", "id_number", "ethnicity",
            "address_detail", "ward", "district", "city",
            "full_address", "role", "password"
        ]        
        extra_kwargs = {"password": {"write_only": True}}
    
    def get_full_address(self, obj):
        parts = [obj.address_detail, obj.ward, obj.district, obj.city]
        return ", ".join([p for p in parts if p])

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user


class UserPublicSerializer(serializers.ModelSerializer):
    full_address = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id", "email", "full_name", "phone_number",
            "dob", "gender", "id_number", "ethnicity",
            "full_address", "role"
        ]

    def get_full_address(self, obj):
        parts = [obj.address_detail, obj.ward, obj.district, obj.city]
        return ", ".join([p for p in parts if p])

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "full_name", "phone_number",
            "dob", "gender", "id_number", "ethnicity",
            "address_detail", "ward", "district", "city",
            "role", "email"
        ]
        extra_kwargs = {"email": {"required": False}}

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã tồn tại.")
        return value

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    
class SetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["password1"] != data["password2"]:
            raise serializers.ValidationError("Mật khẩu không khớp.")
        return data
