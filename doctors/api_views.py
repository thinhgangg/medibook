from rest_framework import viewsets
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, SAFE_METHODS
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework import filters
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg
from datetime import datetime, timedelta, date as date_cls
from django.db.models import F, ExpressionWrapper, IntegerField

from .models import Doctor, DoctorAvailability, DoctorDayOff, Specialty, DoctorReview
from .serializers import DoctorSerializer, DoctorAvailabilitySerializer, DoctorDayOffSerializer, SpecialtySerializer, DoctorReviewSerializer
from appointments.models import Appointment

class DoctorPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer
    pagination_class = DoctorPagination
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter]
    search_fields = ["user__full_name"]
    
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        qs = Doctor.objects.select_related("user", "specialty").filter(is_active=True)

        if self.request.query_params.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        if self.action == "list":
            specialty = self.request.query_params.get("specialty")
            gender = self.request.query_params.get("gender")
            min_exp = self.request.query_params.get("min_experience")
            max_exp = self.request.query_params.get("max_experience")
            min_rating = self.request.query_params.get("min_rating")
            name = self.request.query_params.get("name")

            if specialty:
                qs = qs.filter(specialty__slug__iexact=specialty)

            if gender:
                qs = qs.filter(user__gender__iexact=gender)

            if name:
                qs = qs.filter(user__full_name__icontains=name)

            today = timezone.now().date()
            qs = qs.annotate(
                experience_years_db=ExpressionWrapper(
                    today.year - F("started_practice__year"),
                    output_field=IntegerField()
                )
            )

            if min_exp:
                qs = qs.filter(experience_years_db__gte=int(min_exp))
            if max_exp:
                qs = qs.filter(experience_years_db__lte=int(max_exp))

            qs = qs.annotate(average_rating_db=Avg('reviews__stars'))

            if min_rating:
                qs = qs.filter(average_rating_db__gte=float(min_rating))

        return qs

    def perform_create(self, serializer):
        if Doctor.objects.filter(user=self.request.user).exists():
            raise PermissionDenied("Hồ sơ bác sĩ của bạn đã tồn tại.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        obj = get_object_or_404(Doctor, user=request.user)

        if request.method == 'GET':
            return Response(self.get_serializer(obj).data)

        serializer = self.get_serializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user) 
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='slots')
    def slots(self, request, slug=None):
        doctor = self.get_object()
        tz = timezone.get_current_timezone()
        now = timezone.now()

        date_str = request.query_params.get("date")
        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")

        if date_str:
            try:
                target_date = date_cls.fromisoformat(date_str)
            except ValueError:
                return Response({"detail": "Invalid date format"}, status=400)
            days = [target_date]

        elif start_str and end_str:
            try:
                start_date = date_cls.fromisoformat(start_str)
                end_date = date_cls.fromisoformat(end_str)
            except ValueError:
                return Response({"detail": "Invalid date format"}, status=400)

            if end_date < start_date:
                return Response({"detail": "end must be >= start"}, status=400)

            days = [start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)]
        else:
            return Response({"detail": "Missing query param: date=YYYY-MM-DD hoặc start/end"}, status=400)

        results = []

        for target_date in days:
            weekday = target_date.weekday()
            avails = doctor.availabilities.filter(weekday=weekday, is_active=True)

            if not avails.exists():
                results.append({"date": str(target_date), "slots": []})
                continue

            start_of_day = timezone.make_aware(datetime.combine(target_date, datetime.min.time()), tz)
            end_of_day   = timezone.make_aware(datetime.combine(target_date, datetime.max.time()), tz)

            taken = doctor.appointments.exclude(status="CANCELLED")\
                .filter(start_at__lt=end_of_day, end_at__gt=start_of_day)\
                .values_list("start_at", "end_at")
            busy = [(s, e) for s, e in taken]

            offs = doctor.day_offs.filter(date=target_date)
            if offs.filter(start_time__isnull=True, end_time__isnull=True).exists():
                results.append({"date": str(target_date), "slots": []})
                continue

            off_intervals = []
            for off in offs:
                if off.start_time and off.end_time:
                    off_start = timezone.make_aware(datetime.combine(target_date, off.start_time), tz)
                    off_end   = timezone.make_aware(datetime.combine(target_date, off.end_time), tz)
                    off_intervals.append((off_start, off_end))

            slots = []
            for av in avails:
                slot_len = timedelta(minutes=av.slot_minutes)
                cur = timezone.make_aware(datetime.combine(target_date, av.start_time), tz)
                limit = timezone.make_aware(datetime.combine(target_date, av.end_time), tz)

                while cur + slot_len <= limit:
                    slot_start = cur
                    slot_end   = cur + slot_len

                    if slot_end <= now:
                        cur += slot_len
                        continue

                    overlap_busy = any((slot_start < b_end and slot_end > b_start) for b_start, b_end in busy)
                    overlap_off  = any((slot_start < o_end and slot_end > o_start) for o_start, o_end in off_intervals)

                    if not overlap_busy and not overlap_off:
                        slots.append({
                            "start_at": slot_start.isoformat(),
                            "end_at":   slot_end.isoformat()
                        })

                    cur += slot_len

            results.append({"date": str(target_date), "slots": slots})

        return Response(results)

    
    @action(detail=True, methods=['get'], url_path='reviews')
    def reviews(self, request, slug=None):
        doctor = self.get_object()
        reviews = doctor.reviews.filter(is_active=True)
        serializer = DoctorReviewSerializer(reviews, many=True)
        return Response(serializer.data)

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_staff or u.is_superuser:
            base = DoctorAvailability.objects.all()
        elif hasattr(u, 'doctor_profile'):
            base = DoctorAvailability.objects.filter(doctor=u.doctor_profile)
        else:
            return DoctorAvailability.objects.none()

        wd = self.request.query_params.get("weekday")
        return base.filter(weekday=wd) if wd is not None else base

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới thiết lập lịch làm việc.")
        
        doctor_profile = self.request.user.doctor_profile
        weekday = serializer.validated_data['weekday']
        start_time = serializer.validated_data['start_time']
        end_time = serializer.validated_data['end_time']
        
        overlapping_avails = DoctorAvailability.objects.filter(
            doctor=doctor_profile,
            weekday=weekday,
            end_time__gt=start_time,
            start_time__lt=end_time
        )
        if overlapping_avails.exists():
            raise ValidationError("Lịch làm việc bị trùng lặp với lịch đã có.")

        serializer.save(doctor=doctor_profile)

    def perform_update(self, serializer):
        if not hasattr(self.request.user, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới sửa lịch làm việc.")
        serializer.save(doctor=self.request.user.doctor_profile)

class DoctorDayOffViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorDayOffSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_staff or u.is_superuser:
            qs = DoctorDayOff.objects.all()
        elif hasattr(u, 'doctor_profile'):
            qs = DoctorDayOff.objects.filter(doctor=u.doctor_profile)
        else:
            return DoctorDayOff.objects.none()

        p = self.request.query_params
        df = p.get('date_from')
        dt = p.get('date_to')
        if df:
            from datetime import date as date_cls
            try:
                qs = qs.filter(date__gte=date_cls.fromisoformat(df))
            except ValueError:
                pass
        if dt:
            from datetime import date as date_cls
            try:
                qs = qs.filter(date__lte=date_cls.fromisoformat(dt))
            except ValueError:
                pass
        return qs.order_by('date', 'start_time')

    def perform_create(self, serializer):
        u = self.request.user
        if not hasattr(u, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới tạo lịch nghỉ.")
        
        today = timezone.localdate()
        if serializer.validated_data['date'] < today:
            raise ValidationError({'detail': 'Không thể thêm lịch nghỉ trong quá khứ.'})

        serializer.save(doctor=u.doctor_profile)

    def perform_update(self, serializer):
        u = self.request.user
        if not hasattr(u, 'doctor_profile'):
            raise PermissionDenied("Chỉ bác sĩ mới sửa lịch nghỉ.")

        today = timezone.localdate()
        if serializer.validated_data['date'] < today:
            raise ValidationError("Không thể sửa lịch nghỉ trong quá khứ.")

        serializer.save(doctor=u.doctor_profile)

    def perform_destroy(self, instance):
        today = timezone.localdate()
        if instance.date < today:
            raise PermissionDenied("Không thể xóa lịch nghỉ trong quá khứ.")
        
        instance.delete()

class SpecialtyViewSet(viewsets.ModelViewSet):
    queryset = Specialty.objects.all().order_by("id")
    serializer_class = SpecialtySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        if not self.request.user.is_staff:
            raise PermissionDenied("Chỉ admin mới được quản lý chuyên khoa.")
        serializer.save()

    def perform_update(self, serializer):
        if not self.request.user.is_staff:
            raise PermissionDenied("Chỉ admin mới được quản lý chuyên khoa.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_staff:
            raise PermissionDenied("Chỉ admin mới được quản lý chuyên khoa.")
        instance.delete()

class DoctorReviewCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        patient = request.user.patient_profile

        try:
            appointment = Appointment.objects.get(id=appointment_id, patient=patient)
        except Appointment.DoesNotExist:
            return Response({"detail": "Cuộc hẹn không hợp lệ hoặc không thuộc về bệnh nhân này."}, status=status.HTTP_404_NOT_FOUND)

        serializer = DoctorReviewSerializer(data=request.data, context={'appointment': appointment})

        if serializer.is_valid():
            review = DoctorReview.create_review(appointment, serializer.validated_data['stars'], serializer.validated_data['comment'])
            return Response({
                "message": "Đánh giá của bạn đã được gửi thành công!",
                "review": DoctorReviewSerializer(review).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)