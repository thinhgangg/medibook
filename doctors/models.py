from django.db import models
from accounts.models import CustomUser  

class Doctor(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='doctor_profile')
    
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
    ]
    
    gender = models.CharField(max_length=6, choices=GENDER_CHOICES, blank=True, null=True)  # Giới tính
    specialty = models.CharField(max_length=100)  # Chuyên khoa
    bio = models.TextField(blank=True, null=True)  # Tiểu sử
    hospital = models.CharField(max_length=255)  # Bệnh viện công tác
    
    def __str__(self):
        return self.user.full_name 
    
    @property
    def phone_number(self):
        return self.user.phone_number 

    class Meta:
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'

class DoctorAvailability(models.Model):
    doctor = models.ForeignKey('doctors.Doctor', on_delete=models.CASCADE, related_name='availabilities')
    # 0=Mon ... 6=Sun theo Python weekday()
    weekday = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(7)])
    start_time = models.TimeField()
    end_time   = models.TimeField()
    slot_minutes = models.PositiveSmallIntegerField(default=30)
    is_active  = models.BooleanField(default=True)

    class Meta:
        unique_together = ('doctor', 'weekday')
        ordering = ['doctor_id', 'weekday', 'start_time']

    def __str__(self):
        return f"Avail D#{self.doctor_id} wd={self.weekday} {self.start_time}-{self.end_time}"