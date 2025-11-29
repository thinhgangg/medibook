from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Patient
from .serializers import PatientSerializer

class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        return Patient.objects.all() if (user.is_staff or user.is_superuser) else Patient.objects.filter(user=user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        patient = get_object_or_404(Patient, user=request.user)

        if request.method == 'GET':
            return Response(self.get_serializer(patient).data)

        if request.method == 'PATCH':
            if 'profile_picture' in request.FILES:
                file_obj = request.FILES['profile_picture']
                
                patient.profile_picture = file_obj
                patient.save(update_fields=['profile_picture']) 
            
            serializer = self.get_serializer(patient, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=400)