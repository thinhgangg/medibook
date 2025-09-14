from django.db import models
from accounts.models import CustomUser
from cloudinary.models import CloudinaryField

class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='patient_profile')
    
    insurance_no = models.CharField(max_length=50, blank=True, null=True)
    occupation = models.CharField(max_length=100, blank=True, null=True)
    
    profile_picture = CloudinaryField('image', blank=True, null=True)

    def __str__(self):
        return self.user.full_name 
    
    @property
    def phone_number(self):
        return self.user.phone_number

    class Meta:
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
