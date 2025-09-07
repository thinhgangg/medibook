from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('accounts/', include('accounts.urls')),
    path('api/accounts/', include('accounts.api_urls')),
    path('appointments/', include('appointments.urls')),
    path('api/appointments/', include('appointments.api_urls')),
    path('doctors/', include('doctors.urls')),
    path('api/doctors/', include('doctors.api_urls')),
    path('patients/', include('patients.urls')),
    path('api/patients/', include('patients.api_urls')),
    path('dashboard/', include('dashboard.urls')),
    path('api/dashboard/', include('dashboard.api_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
