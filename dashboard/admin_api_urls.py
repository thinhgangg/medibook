# dashboard/admin_api_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_api_views

router = DefaultRouter()
router.register(r'users', admin_api_views.AdminUserViewSet, basename='admin-users')
router.register(r'doctors', admin_api_views.AdminDoctorViewSet, basename='admin-doctors')
router.register(r'appointments', admin_api_views.AdminAppointmentViewSet, basename='admin-appointments')
router.register(r'specialties', admin_api_views.AdminSpecialtyViewSet, basename='admin-specialties')
router.register(r'reviews', admin_api_views.AdminReviewViewSet, basename='admin-reviews')

urlpatterns = [
    path('', include(router.urls)),
    path('statistics/', admin_api_views.AdminStatisticsView.as_view(), name='admin-statistics'),
]