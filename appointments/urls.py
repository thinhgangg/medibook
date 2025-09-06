from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet

app_name = 'appointments'

urlpatterns = [
    path('', views.appointment_view, name='appointment'),
    path('invoice/', views.appointment_invoice_view, name='appointment_invoice'),
    path('list/', views.appointment_list_view, name='appointment_list'),
    path('success/', views.appointment_success_view, name='appointment_success'),
    path('search/', views.search, name='search'),
]


router = DefaultRouter()
router.register(r'api', AppointmentViewSet, basename='appointment')
urlpatterns += router.urls
