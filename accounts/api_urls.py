from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    DoctorRegisterView,
    MeView,
    LogoutView,
    SendOTPView,
    VerifyOTPView,
    PatientSetPasswordView,
    PatientProfileView,
)

app_name = 'accounts_api'

urlpatterns = [
    path('register/doctor/', DoctorRegisterView.as_view(), name='register-doctor'),

    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('me/', MeView.as_view()),

    path('send_otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify_otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path("set_password/", PatientSetPasswordView.as_view(), name="set_password"),
    path("patient/profile/", PatientProfileView.as_view(), name="patient_profile"),
]
