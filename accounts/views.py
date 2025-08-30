from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.models import CustomUser
from .serializers import UserSerializer 
from rest_framework import status
from rest_framework.views import APIView

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Tạo token
        response = super().post(request, *args, **kwargs)

        # Lấy user từ serializer
        user = serializer.user  
        user_serializer = UserSerializer(user)

        # Gắn thêm thông tin user vào response
        response.data['user'] = user_serializer.data
        return response

class RegisterView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)