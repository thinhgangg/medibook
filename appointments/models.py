from django.db import models
from doctors.models import Doctor  # Liên kết với model bác sĩ
from patients.models import Patient  # Liên kết với model bệnh nhân

class Appointment(models.Model):
    # Liên kết với bác sĩ và bệnh nhân
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    
    # Thông tin cuộc hẹn
    appointment_time = models.DateTimeField()  # Thời gian cuộc hẹn
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled')
    ], default='PENDING')  # Trạng thái cuộc hẹn
    reason = models.CharField(max_length=255, blank=True, null=True)  # Lý do cuộc hẹn
    notes = models.TextField(blank=True, null=True)  # Ghi chú thêm
    
    # Thời gian tạo và cập nhật
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Appointment #{self.id} - {self.patient.user.full_name} with {self.doctor.user.full_name} on {self.appointment_time}"

    class Meta:
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'
