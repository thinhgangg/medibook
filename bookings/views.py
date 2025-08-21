from django.shortcuts import render

def booking_view(request):
    return render(request, 'bookings/booking.html')

def booking_invoice_view(request):
    return render(request, 'bookings/booking-invoice.html')

def booking_list_view(request):
    return render(request, 'bookings/booking-list.html')

def booking_success_view(request):
    return render(request, 'bookings/booking-success.html')
