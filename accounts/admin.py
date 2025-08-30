from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['username', 'full_name', 'email', 'role', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('full_name', 'role', 'phone_number', 'address')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)