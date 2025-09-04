from django.db import models
from accounts.models import CustomUser
from doctors.validators import validate_avatar

class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='patient_profile')
    
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
    ]
    
    gender = models.CharField(max_length=6, choices=GENDER_CHOICES, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    insurance_no = models.CharField(max_length=100)
    address = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to="patients/", blank=True, null=True, validators=[validate_avatar],)
    
    def __str__(self):
        return self.user.full_name 
    
    @property
    def phone_number(self):
        return self.user.phone_number

    class Meta:
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
