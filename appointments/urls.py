from django.urls import path
from . import views

app_name = 'appointments'

urlpatterns = [
    path('', views.appointment_view, name='appointment'),
    path('invoice/', views.appointment_invoice_view, name='appointment_invoice'),
    path('list/', views.appointment_list_view, name='appointment_list'),
    path('success/', views.appointment_success_view, name='appointment_success'),
    path('search/', views.search, name='search'),

    path("dat-kham/", views.booking_youmed, name="booking"),

    path("dat-kham/bac-si/<slug:doctor_slug>/", views.booking_youmed, name="booking_by_slug"),
    path("dat-kham/bac-si/id/<int:doctor_id>/", views.booking_youmed, name="booking_by_id"),

    path("dashboard/patient/appointments/", views.patient_appointments_page, name="patient_page"),
    path("dashboard/doctor/appointments/", views.doctor_appointments_page, name="doctor_page"),
]