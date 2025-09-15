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

    doctor     = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="appointments")
    patient    = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    start_at = models.DateTimeField(null=True, blank=True)
    end_at   = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True, null=True)
    status     = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-start_at"]

    def __str__(self):
        return f"{self.patient_id} with {self.doctor_id} on {self.start_at:%H:%M %d-%m-%Y}"
    