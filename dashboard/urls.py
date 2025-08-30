from django.urls import path
from . import views

urlpatterns = [
    path('doctor/', views.doctor_dashboard, name='doctor_dashboard'),  # Dashboard cho bác sĩ
    path('patient/', views.patient_dashboard, name='patient_dashboard'),  # Dashboard cho bệnh nhân
    path('admin/', views.admin_dashboard, name='admin_dashboard'),  # Dashboard cho admin
]
