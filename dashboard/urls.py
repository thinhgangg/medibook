from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.index_view, name='index'),
    path('appointments/', views.appointments_view, name='appointments'),
    path('doctors/', views.doctors_view, name='doctors'),
    path('patients/', views.patients_view, name='patients'),
]
