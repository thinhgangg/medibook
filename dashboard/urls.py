from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('', views.doctor_dashboard, name='doctor_dashboard'),
    path('', views.patient_dashboard, name='patient_dashboard'),
    path('', views.admin_dashboard, name='admin_dashboard'),
]