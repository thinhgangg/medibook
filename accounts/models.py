from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    first_name = None
    last_name = None
    # Các trường tùy chỉnh cho người dùng
    full_name = models.CharField(max_length=255, blank=True, null=True)  # Tên đầy đủ của người dùng
    phone_number = models.CharField(max_length=20, blank=True, null=True)  # Số điện thoại
    address = models.TextField(blank=True, null=True)  # Địa chỉ
    role = models.CharField(max_length=50, choices=[  # Vai trò của người dùng: Bệnh nhân, Bác sĩ, Admin
        ('PATIENT', 'Patient'),
        ('DOCTOR', 'Doctor'),
        ('ADMIN', 'Admin')
    ], default='PATIENT')
    is_active = models.BooleanField(default=True)  # Trạng thái hoạt động của tài khoản

    # Dùng để trả về tên người dùng (hoặc có thể thay bằng full_name nếu có trường này)
    def __str__(self):
        return self.full_name if self.full_name else self.username  # Trả về full_name nếu có, nếu không trả về username
