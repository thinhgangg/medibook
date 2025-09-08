# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    model = CustomUser

    list_display = ("id", "email", "full_name", "phone_number", "role", "is_active", "is_staff")
    list_filter = ("is_active", "is_staff", "is_superuser", "role", "groups")
    search_fields = ("email", "full_name", "phone_number", "address")
    ordering = ("id",)
    filter_horizontal = ("groups", "user_permissions")

    fieldsets = (
        (_("Credentials"), {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("full_name", "phone_number", "address", "role")}),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Important dates"), {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "phone_number", "address", "role",
                       "password1", "password2",
                       "is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
    )
