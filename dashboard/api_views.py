from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from doctors.models import Doctor
from patients.models import Patient
from appointments.models import Appointment

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_dashboard_api(request):
    doctor = request.user.doctor_profile
    total_appointments = Appointment.objects.filter(doctor=doctor).count()
    appointments_by_status = list(
        Appointment.objects.filter(doctor=doctor)
        .values('status')
        .annotate(count=Count('status'))
    )
    return Response({
        "total_appointments": total_appointments,
        "appointments_by_status": appointments_by_status,
        "message": "Dữ liệu dashboard bác sĩ thành công."
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_dashboard_api(request):
    patient = request.user.patient_profile
    total_appointments = Appointment.objects.filter(patient=patient).count()
    appointments_by_status = list(
        Appointment.objects.filter(patient=patient)
        .values('status')
        .annotate(count=Count('status'))
    )
    return Response({
        "total_appointments": total_appointments,
        "appointments_by_status": appointments_by_status,
        "message": "Dữ liệu dashboard bệnh nhân thành công."
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_api(request):
    total_doctors = Doctor.objects.count()
    total_patients = Patient.objects.count()
    total_appointments = Appointment.objects.count()
    appointments_by_status = list(
        Appointment.objects.values('status').annotate(count=Count('status'))
    )
    return Response({
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "appointments_by_status": appointments_by_status,
        "message": "Dữ liệu dashboard admin thành công."
    })
