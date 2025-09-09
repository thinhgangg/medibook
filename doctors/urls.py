from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, DoctorAvailabilityViewSet, DoctorDayOffViewSet
from . import views  # Import views for doctor profile page, etc.

app_name = "doctors"

# Define router for API views
router = DefaultRouter()
router.register(r"doctors", DoctorViewSet, basename="doctor")
router.register(r"availabilities", DoctorAvailabilityViewSet, basename="availability")
router.register(r"day-offs", DoctorDayOffViewSet, basename="dayoff")

urlpatterns = [
    # API routes
    path("", include(router.urls)),

    # Custom view routes
    path('profile/', views.doctor_profile, name='doctor_own_profile'),  # Profile của chính mình (không pk)
    path('profile/<int:pk>/', views.doctor_profile, name='doctor_profile'),  # Profile của doctor cụ thể (cho admin)
    path('schedule/', views.doctor_schedule, name='doctor_schedule'),  # Doctor Schedule Page (giữ nguyên)
]