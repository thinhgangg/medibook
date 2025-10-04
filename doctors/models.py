from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.db.models import Avg
from accounts.models import CustomUser
from patients.models import Patient

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
    experience_detail = models.TextField(default="Bác sĩ chưa cập nhật thông tin chi tiết về kinh nghiệm.", blank=True, null=True)
    profile_picture = models.ImageField(upload_to='doctors/', blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False)
    
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
        today = timezone.now().date()
        return today.year - self.started_practice.year - (
            (today.month, today.day) < (self.started_practice.month, self.started_practice.day)
        )

    @property
    def average_rating(self):
        avg = self.reviews.aggregate(Avg('stars'))['stars__avg']
        return round(avg, 1) if avg is not None else None

    class Meta:
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'

class Specialty(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    specialty_picture = models.ImageField(upload_to='specialties/', blank=True, null=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class DoctorAvailability(models.Model):
    doctor = models.ForeignKey('doctors.Doctor', on_delete=models.CASCADE, related_name='availabilities')
    weekday = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(7)])
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_minutes = models.PositiveSmallIntegerField(default=30)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['doctor_id', 'weekday', 'start_time']

    def __str__(self):
        return f"Avail D#{self.doctor_id} wd={self.weekday} {self.start_time}-{self.end_time}"

class DoctorDayOff(models.Model):
    doctor = models.ForeignKey('doctors.Doctor', on_delete=models.CASCADE, related_name='day_offs')
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time   = models.TimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['doctor_id', 'date', 'start_time']

    def __str__(self):
        rng = "full-day" if self.start_time is None else f"{self.start_time}-{self.end_time}"
        return f"DayOff D#{self.doctor_id} {self.date} {rng}"

class DoctorReview(models.Model):
    appointment = models.OneToOneField(
        'appointments.Appointment',
        on_delete=models.CASCADE,
        related_name='review',
        null=True, blank=True
    )
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='reviews')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='doctor_reviews')
    stars = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['doctor_id', '-created_at']

    def __str__(self):
        return f"Review D#{self.doctor_id} by P#{self.patient_id}: {self.stars} stars"
    
    @classmethod
    def create_review(cls, appointment, stars, comment):
        from appointments.models import Appointment
        if appointment.status != Appointment.Status.COMPLETED:
            raise ValueError("Cannot review an appointment that is not completed")
        if hasattr(appointment, 'review'):
            raise ValueError("This appointment already has a review")
        review = cls(appointment=appointment, doctor=appointment.doctor, patient=appointment.patient, stars=stars, comment=comment)
        review.save()
        return review