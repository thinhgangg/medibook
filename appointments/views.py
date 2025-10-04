from django.shortcuts import render
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from doctors.models import Doctor

def appointment_view(request):
    return render(request, 'appointments/appointment.html')

def history_view(request):
    return render(request, 'appointments/history.html')

@login_required(login_url="/accounts/login/")
def appointment_create(request):
    doctor_slug = request.GET.get("doctor")
    doctor = get_object_or_404(Doctor, slug=doctor_slug)
    return render(request, "appointments/new.html", {"doctor": doctor})