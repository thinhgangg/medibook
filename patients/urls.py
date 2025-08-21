from django.urls import path
from . import views

app_name = 'patients'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('appointments/', views.appointments_view, name='appointments'),
    path('profile/', views.profile_view, name='profile'),
]
