from django.urls import path
from . import views

app_name = 'appointments'

urlpatterns = [
    path('', views.appointment_view, name='appointment'),
    path("new/", views.appointment_create, name="appointment_create"),
    path("history/", views.history_view, name="history"),
]