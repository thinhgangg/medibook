from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .api_views import (
    CustomTokenObtainPairView,
    DoctorRegisterView,
    MeView,
    LogoutView,
    SendOTPView,
    VerifyOTPView,
    PatientSetPasswordView,
    PatientProfileView,
    ForgotPasswordSendOTPView,
    ForgotPasswordVerifyOTPView,
    ForgotPasswordSetPasswordView,
)

app_name = 'accounts_api'

urlpatterns = [
    path('register/doctor/', DoctorRegisterView.as_view(), name='register_doctor'),

    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('me/', MeView.as_view()),

    path('send_otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify_otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('set_password/', PatientSetPasswordView.as_view(), name='set_password'),
    path('patient/profile/', PatientProfileView.as_view(), name='patient_profile'),
    
    path('forgot_password/send_otp/', ForgotPasswordSendOTPView.as_view(), name='forgot_password_send_otp'),
    path('forgot_password/verify_otp/', ForgotPasswordVerifyOTPView.as_view(), name='forgot_password_verify_otp'),
    path('forgot_password/set_password/', ForgotPasswordSetPasswordView.as_view(), name='forgot_password_set_password'),
]
