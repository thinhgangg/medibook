from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

def login_register_view(request):
    action = request.GET.get("action", "login")
    return render(request, "accounts/login.html", {"action": action})

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return render(request, "accounts/forgot-password.html")