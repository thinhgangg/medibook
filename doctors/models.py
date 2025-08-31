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
