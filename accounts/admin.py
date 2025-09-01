# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    model = CustomUser

    # Bảng list
    list_display = (
        "id", "username", "email", "full_name", "phone_number", "role",
        "is_active", "is_staff",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "role", "groups")
    search_fields = ("username", "email", "full_name", "phone_number", "address")
    ordering = ("id",)
    filter_horizontal = ("groups", "user_permissions")

    fieldsets = (
        (_("Credentials"), {"fields": ("username", "password")}),
        (_("Personal info"), {"fields": ("full_name", "email", "phone_number", "address", "role")}),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "username", "email", "full_name", "phone_number", "address", "role",
                "password1", "password2",
                "is_active", "is_staff", "is_superuser", "groups", "user_permissions",
            ),
        }),
    )
