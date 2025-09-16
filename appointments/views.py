from django.shortcuts import render

def appointment_view(request):
    return render(request, 'appointments/appointment.html')

def appointment_create(request):
    doctor_slug = request.GET.get("doctor")
    return render(request, "appointments/new.html", {"doctor_slug": doctor_slug})