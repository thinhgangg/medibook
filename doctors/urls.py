from django.urls import path
from . import views

urlpatterns = [
    path("<slug:slug>/", views.doctor_profile, name="doctor_profile"),
]