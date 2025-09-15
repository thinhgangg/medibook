from django.urls import path
from . import api_views

urlpatterns = [
    path('doctor/', api_views.doctor_dashboard_api, name='doctor_dashboard_api'),
    path('patient/', api_views.patient_dashboard_api, name='patient_dashboard_api'),
    path('admin/', api_views.admin_dashboard_api, name='admin_dashboard_api'),
]