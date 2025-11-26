# dashboard/admin_api_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.utils import timezone

from accounts.models import CustomUser
from doctors.models import Doctor, Specialty, DoctorReview
from patients.models import Patient
from appointments.models import Appointment
from .admin_serializers import AdminUserSerializer, AdminDoctorSerializer, AdminAppointmentSerializer, AdminSpecialtySerializer, AdminReviewSerializer

class AdminUserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = AdminUserPagination
    
    def get_queryset(self):
        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')
        
        queryset = CustomUser.objects.all()
        
        if role:
            queryset = queryset.filter(role=role)
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | 
                Q(email__icontains=search) |
                Q(phone_number__icontains=search)
            )
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
        return queryset.order_by('-date_joined')
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully',
            'is_active': user.is_active
        })
    
    @action(detail=False, methods=['get'])
    def doctors(self, request):
        doctors = CustomUser.objects.filter(role='DOCTOR')
        serializer = self.get_serializer(doctors, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def patients(self, request):
        patients = CustomUser.objects.filter(role='PATIENT')
        serializer = self.get_serializer(patients, many=True)
        return Response(serializer.data)

class AdminDoctorViewSet(viewsets.ModelViewSet):
    serializer_class = AdminDoctorSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Doctor.objects.select_related('user', 'specialty')
    
    def get_queryset(self):
        search = self.request.query_params.get('search')
        specialty = self.request.query_params.get('specialty')
        is_active = self.request.query_params.get('is_active')
        is_featured = self.request.query_params.get('is_featured')
        
        queryset = Doctor.objects.select_related('user', 'specialty')
        
        if search:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(specialty__name__icontains=search)
            )
        if specialty:
            queryset = queryset.filter(specialty__slug=specialty)
        if is_active is not None:
            queryset = queryset.filter(user__is_active=is_active.lower() == 'true')
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
            
        return queryset.order_by('-user__date_joined')
    
    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        doctor = self.get_object()
        doctor.is_featured = not doctor.is_featured
        doctor.save()
        return Response({
            'message': f'Doctor {"featured" if doctor.is_featured else "unfeatured"} successfully',
            'is_featured': doctor.is_featured
        })
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        doctor = self.get_object()
        if doctor.user:
            doctor.user.is_active = not doctor.user.is_active
            doctor.user.save()
            return Response({
                'message': f'Doctor {"activated" if doctor.user.is_active else "deactivated"} successfully',
                'is_active': doctor.user.is_active
            })
        return Response({'message': 'Doctor has no associated user.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        doctor = self.get_object()
        reviews = doctor.reviews.filter(is_active=True).order_by('-created_at')
        serializer = AdminReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        if instance.user:
            instance.user.delete()
        else:
            instance.delete()

class AdminAppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminAppointmentSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Appointment.objects.select_related('doctor__user', 'patient__user')
    
    def get_queryset(self):
        return super().get_queryset().order_by('-start_at')
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        queryset = Appointment.objects.values('status').annotate(count=Count('id')).order_by()
        
        stats_data = {item['status']: item['count'] for item in queryset}
        
        return Response(stats_data)

class AdminSpecialtyViewSet(viewsets.ModelViewSet):
    serializer_class = AdminSpecialtySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Specialty.objects.all()
    
    def get_queryset(self):
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')
        
        queryset = Specialty.objects.all()
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
        return queryset.order_by('name')
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        specialty = self.get_object()
        specialty.is_active = not specialty.is_active
        specialty.save()

        return Response({
            "message": f"Specialty {'activated' if specialty.is_active else 'deactivated'} successfully",
            "is_active": specialty.is_active
        })

class AdminReviewViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminReviewSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = DoctorReview.objects.select_related('doctor__user', 'patient__user', 'appointment')
    
    def get_queryset(self):
        return super().get_queryset().order_by('-created_at')

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        review = self.get_object()
        review.is_active = not review.is_active
        review.save()
        return Response({
            'message': f'Review {"activated" if review.is_active else "deactivated"} successfully',
            'is_active': review.is_active
        })

class AdminStatisticsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        today = timezone.now().date()
        stats = {
            'total_users': CustomUser.objects.count(),
            'total_doctors': Doctor.objects.count(),
            'total_patients': Patient.objects.count(),
            'total_appointments': Appointment.objects.count(),
            'total_reviews': DoctorReview.objects.count(),
            'active_doctors': Doctor.objects.filter(is_active=True).count(),
            'active_patients': Patient.objects.filter(user__is_active=True).count(),
            'today_appointments': Appointment.objects.filter(start_at__date=today).count(),
            'pending_appointments': Appointment.objects.filter(status='PENDING').count(),
            'completed_appointments': Appointment.objects.filter(status='COMPLETED').count(),
        }
        return Response(stats)