from django.contrib import admin
from django.utils.html import format_html
from .models import Doctor

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "specialty", "preview", "is_active")
    readonly_fields = ("preview",)

    def name(self, obj):
        return obj.user.full_name
    name.short_description = "Full Name"

    def preview(self, obj):
        if obj.profile_picture:
            return format_html('<img src="{}" width="120" style="border-radius: 6px;" />', obj.profile_picture.url)
        return "No Image"
    preview.short_description = "Profile Picture"
