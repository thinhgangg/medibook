from rest_framework.routers import DefaultRouter
from .api_views import AppointmentViewSet, AppointmentImageViewSet

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'appointment-images', AppointmentImageViewSet, basename='appointmentimage')

urlpatterns = router.urls
