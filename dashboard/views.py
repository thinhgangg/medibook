from django.shortcuts import render

def index_view(request):
    return render(request, 'dashboard/index.html')

def appointments_view(request):
    return render(request, 'dashboard/appointments.html')

def doctors_view(request):
    return render(request, 'dashboard/doctors.html')

def patients_view(request):
    return render(request, 'dashboard/patients.html')
