from django.urls import path
from . import views

urlpatterns = [
        path('schedule/', views.doctor_schedule, name='doctor_schedule'),
]
