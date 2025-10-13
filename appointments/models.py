from django.db import models
from django.utils import timezone

from doctors.models import Doctor
from patients.models import Patient

class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING   = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    doctor     = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments")
    patient    = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments")
    start_at = models.DateTimeField(null=True, blank=True)
    end_at   = models.DateTimeField(null=True, blank=True)
    note     = models.TextField(blank=True, null=True)
    status     = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-start_at"]

    def __str__(self):
        doctor_name = self.doctor.user.full_name if self.doctor else "Unknown Doctor"
        patient_name = self.patient.user.full_name if self.patient else "Unknown Patient"
        if self.start_at:
            start_local = timezone.localtime(self.start_at)
            return f"{patient_name} with {doctor_name} on {start_local:%H:%M %d-%m-%Y}"
        return f"{patient_name} with {doctor_name}"

class AppointmentImage(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="appointment_images/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Appointment #{self.appointment_id} at {self.uploaded_at:%d-%m-%Y}"
