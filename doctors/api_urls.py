from rest_framework.routers import DefaultRouter
from .api_views import DoctorViewSet, DoctorAvailabilityViewSet, DoctorDayOffViewSet

router = DefaultRouter()
router.register(r'availability', DoctorAvailabilityViewSet, basename='doctor-availability')
router.register(r'days-off', DoctorDayOffViewSet, basename='doctor-dayoff')
router.register(r'', DoctorViewSet, basename='doctor')

urlpatterns = router.urls
