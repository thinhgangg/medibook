from django.shortcuts import render

def dashboard_view(request):
    return render(request, 'patients/dashboard.html')

def appointments_view(request):
    return render(request, 'patients/appointments.html')

def profile_view(request):
    return render(request, 'patients/profile-setting.html')
