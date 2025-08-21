from django.urls import path
from . import views

app_name = 'doctors'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('appointments/', views.appointments_view, name='appointments'),
    path('appointment-detail/', views.appointment_detail_view, name='appointment_detail'),
    path('profile/', views.profile_view, name='profile'),
]
