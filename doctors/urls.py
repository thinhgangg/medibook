from django.urls import path
from . import views

app_name = 'doctors'

urlpatterns = [
    path('profile/', views.doctor_profile, name='doctor_own_profile'),  
    path('profile/<int:pk>/', views.doctor_profile, name='doctor_profile'),  
    path('schedule/', views.doctor_schedule, name='doctor_schedule'), 
]
