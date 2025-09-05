from django.shortcuts import render

def appointment_view(request):
    return render(request, 'appointments/appointment.html')

def appointment_invoice_view(request):
    return render(request, 'appointments/appointment-invoice.html')

def appointment_list_view(request):
    return render(request, 'appointments/appointment-list.html')

def appointment_success_view(request):
    return render(request, 'appointments/appointment-success.html')
