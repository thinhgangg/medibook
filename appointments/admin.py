from django.contrib import admin
from .models import Appointment, AppointmentImage
from django.utils.html import format_html

class AppointmentImageInline(admin.StackedInline):
    model = AppointmentImage
    extra = 1
    readonly_fields = ["preview"]

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="200" />', obj.image.url)
        return "No image"
    preview.short_description = "Preview"

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    inlines = [AppointmentImageInline]
