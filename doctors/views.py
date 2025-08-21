from django.shortcuts import render

def dashboard_view(request):
    return render(request, 'doctors/dashboard.html')

def appointments_view(request):
    return render(request, 'doctors/appointments.html')

def appointment_detail_view(request):
    return render(request, 'doctors/appointment-detail.html')

def profile_view(request):
    return render(request, 'doctors/profile.html')
