from django.urls import path
from . import views

urlpatterns = [
    path('doctor/', views.doctor_dashboard, name='doctor_dashboard'), 
    path('patient/', views.patient_dashboard, name='patient_dashboard'),  
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
]
