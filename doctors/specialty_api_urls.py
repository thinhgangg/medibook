from rest_framework.routers import DefaultRouter
from .api_views import SpecialtyViewSet

router = DefaultRouter()

router.register(r'', SpecialtyViewSet, basename='specialty')

urlpatterns = router.urls
