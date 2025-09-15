from rest_framework.routers import DefaultRouter
from .api_views import PatientViewSet

router = DefaultRouter()
router.register(r'', PatientViewSet, basename='patient')

urlpatterns = router.urls
