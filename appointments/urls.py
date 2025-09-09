from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "appointments"

# Router cho API (DRF)
router = DefaultRouter()
router.register(r"api", views.AppointmentViewSet, basename="appointment")

urlpatterns = [
    # Các trang giao diện cũ
    path("", views.appointment_view, name="appointment"),
    path("invoice/", views.appointment_invoice_view, name="appointment_invoice"),
    path("list/", views.appointment_list_view, name="appointment_list"),
    path("success/", views.appointment_success_view, name="appointment_success"),
    path("search/", views.search, name="search"),

    # ⭐ Trang đặt lịch mới (frontend-only)
    path("dat-kham/", views.booking_youmed, name="booking"),

    # (tuỳ chọn) mở theo bác sĩ
    path("dat-kham/bac-si/<slug:doctor_slug>/", views.booking_youmed, name="booking_by_slug"),
    path("dat-kham/bac-si/id/<int:doctor_id>/", views.booking_youmed, name="booking_by_id"),

    # ⭐⭐ TRANG LỊCH KHÁM MỚI (bệnh nhân & bác sĩ)
    path("dashboard/patient/appointments/", views.patient_appointments_page, name="patient_page"),
    path("dashboard/doctor/appointments/", views.doctor_appointments_page, name="doctor_page"),

    # Đưa router API vào dưới cùng
    path("", include(router.urls)),
]
