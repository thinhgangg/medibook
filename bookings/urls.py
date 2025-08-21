from django.urls import path
from . import views

app_name = 'bookings'

urlpatterns = [
    path('', views.booking_view, name='booking'),
    path('invoice/', views.booking_invoice_view, name='invoice'),
    path('list/', views.booking_list_view, name='booking_list'),
    path('success/', views.booking_success_view, name='booking_success'),
]
