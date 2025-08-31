from django.db import models
from accounts.models import CustomUser

class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='patient_profile')
    
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
    ]
    
    gender = models.CharField(max_length=6, choices=GENDER_CHOICES, blank=True, null=True)  # Giới tính
    dob = models.DateField()  # Ngày sinh
    insurance_no = models.CharField(max_length=100)  # Số bảo hiểm
    
    def __str__(self):
        return self.user.full_name 
    
    @property
    def phone_number(self):
        return self.user.phone_number

    class Meta:
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
