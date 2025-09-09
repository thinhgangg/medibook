from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet

# Tạo router
router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')

# Định nghĩa các URL pattern
urlpatterns = [
    path('', include(router.urls)),  # Bao gồm các endpoint từ router
]