from django.db import models
from accounts.models import CustomUser  # Liên kết với model người dùng

class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='patient_profile')  # Liên kết 1-1 với CustomUser
    
    # Các lựa chọn giới tính cho bệnh nhân
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
    ]
    
    gender = models.CharField(max_length=6, choices=GENDER_CHOICES, blank=True, null=True)  # Giới tính
    dob = models.DateField()  # Ngày sinh
    insurance_no = models.CharField(max_length=100)  # Số bảo hiểm
    
    # Không cần tạo lại phone_number ở đây, ta sẽ lấy nó từ CustomUser
    def __str__(self):
        return self.user.full_name  # Trả về tên bệnh nhân từ model người dùng
    
    @property
    def phone_number(self):
        return self.user.phone_number  # Trả về phone_number từ CustomUser

    class Meta:
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
