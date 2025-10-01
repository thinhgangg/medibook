from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .decorators import role_required
from doctors.models import Doctor
from patients.models import Patient
from appointments.models import Appointment
from django.db.models import Count

@login_required
def dashboard_view(request):
    user = request.user
    if user.role == 'DOCTOR':
        return doctor_dashboard(request)
    elif user.role == 'PATIENT':
        return patient_dashboard(request)
    elif user.role == 'ADMIN':
        return admin_dashboard(request)
    else:
        return render(request, 'dashboard/error.html', {'message': 'Không có dashboard phù hợp cho vai trò của bạn.'})

@login_required
@role_required('DOCTOR')
def doctor_dashboard(request):
    doctor = request.user.doctor_profile
    total_appointments = Appointment.objects.filter(doctor=doctor).count()
    appointments_by_status = Appointment.objects.filter(doctor=doctor).values('status').annotate(count=Count('status'))

    context = {
        'total_appointments': total_appointments,
        'appointments_by_status': appointments_by_status
    }

    return render(request, 'dashboard/doctor_dashboard.html', context)

@login_required
@role_required('PATIENT')
def patient_dashboard(request):
    patient = request.user.patient_profile
    total_appointments = Appointment.objects.filter(patient=patient).count()
    appointments_by_status = Appointment.objects.filter(patient=patient).values('status').annotate(count=Count('status'))

    context = {
        'total_appointments': total_appointments,
        'appointments_by_status': appointments_by_status
    }

    return render(request, 'dashboard/patient_dashboard.html', context)

@login_required
@role_required('ADMIN')
def admin_dashboard(request):
    total_doctors = Doctor.objects.count()
    total_patients = Patient.objects.count()
    total_appointments = Appointment.objects.count()
    appointments_by_status = Appointment.objects.values('status').annotate(count=Count('status'))

    context = {
        'total_doctors': total_doctors,
        'total_patients': total_patients,
        'total_appointments': total_appointments,
        'appointments_by_status': appointments_by_status
    }

    return render(request, 'dashboard/admin_dashboard.html', context)