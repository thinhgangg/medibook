from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, DoctorAvailabilityViewSet

router = DefaultRouter()
router.register(r'availability', DoctorAvailabilityViewSet, basename='doctor-availability')
router.register(r'', DoctorViewSet, basename='doctor')

urlpatterns = router.urls
