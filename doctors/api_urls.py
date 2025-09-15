from django.urls import path
from rest_framework.routers import DefaultRouter
from .api_views import DoctorViewSet, DoctorAvailabilityViewSet, DoctorDayOffViewSet, DoctorReviewCreateView

router = DefaultRouter()
router.register(r'availability', DoctorAvailabilityViewSet, basename='doctor-availability')
router.register(r'days-off', DoctorDayOffViewSet, basename='doctor-dayoff')
router.register(r'', DoctorViewSet, basename='doctor')

urlpatterns = router.urls + [
    path('appointments/<int:appointment_id>/review/', DoctorReviewCreateView.as_view(), name='create_review'),
    path('<int:pk>/reviews/', DoctorViewSet.as_view({'get': 'reviews'}), name='doctor_reviews'),
]