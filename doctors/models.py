from django.db import models
from accounts.models import CustomUser  
from cloudinary.models import CloudinaryField
from datetime import date as date_cls
from django.utils.text import slugify

class Doctor(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='doctor_profile')

    slug = models.SlugField(max_length=255, unique=True, blank=True)

    specialty = models.ForeignKey(
        "doctors.Specialty",
        on_delete=models.PROTECT,    
        related_name="doctors",
        null=True, blank=True         
    )

    bio = models.TextField(default="Bác sĩ chưa cập nhật tiểu sử", blank=True, null=True)
    
    started_practice = models.DateField(blank=True, null=True)

    experience_detail = models.TextField(default="Bác sĩ chưa cập nhật kinh nghiệm", blank=True, null=True)

    profile_picture = CloudinaryField('image', blank=True, null=True)
    
    is_active = models.BooleanField(default=True, db_index=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.user.full_name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.user.full_name

    @property
    def phone_number(self):
        return self.user.phone_number
    
    @property
    def experience_years(self):
        if not self.started_practice:
            return None
        today = date_cls.today()
        return today.year - self.started_practice.year - (
            (today.month, today.day) < (self.started_practice.month, self.started_practice.day)
        )

    class Meta:
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'

class Specialty(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    specialty_picture = models.ImageField(upload_to='specialties/', blank=True, null=True)
    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class DoctorAvailability(models.Model):
    doctor = models.ForeignKey('doctors.Doctor', on_delete=models.CASCADE, related_name='availabilities')
    weekday = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(7)])  # 0=Mon..6=Sun
    start_time = models.TimeField()
    end_time   = models.TimeField()
    slot_minutes = models.PositiveSmallIntegerField(default=30)
    is_active  = models.BooleanField(default=True)

    class Meta:
        ordering = ['doctor_id', 'weekday', 'start_time']

    def __str__(self):
        return f"Avail D#{self.doctor_id} wd={self.weekday} {self.start_time}-{self.end_time}"
    
class DoctorDayOff(models.Model):
    doctor = models.ForeignKey('doctors.Doctor', on_delete=models.CASCADE, related_name='day_offs')
    date = models.DateField()
    # Nếu nghỉ cả ngày: để cả hai là NULL
    start_time = models.TimeField(null=True, blank=True)
    end_time   = models.TimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['doctor_id', 'date', 'start_time']

    def __str__(self):
        rng = "full-day" if self.start_time is None else f"{self.start_time}-{self.end_time}"
        return f"DayOff D#{self.doctor_id} {self.date} {rng}"