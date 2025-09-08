from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    PatientRegisterView,
    DoctorRegisterView,
    MeView,
    LogoutView,
    SendOTPView,
    VerifyOTPView,
)

app_name = 'accounts_api'

urlpatterns = [
    path('register/patient/', PatientRegisterView.as_view(), name='register-patient'),
    path('register/doctor/', DoctorRegisterView.as_view(), name='register-doctor'),

    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('me/', MeView.as_view()),

    path('register/send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('register/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
]
