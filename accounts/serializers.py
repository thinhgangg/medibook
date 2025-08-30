from rest_framework import serializers
from accounts.models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password'] 
        extra_kwargs = {
            'password': {'write_only': True} 
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)  
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password) 
        user.save()
        return user
