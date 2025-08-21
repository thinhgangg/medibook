from django.shortcuts import render

def home_view(request):
    return render(request, 'home.html')

def privacy_view(request):
    return render(request, 'core/privacy.html')

def terms_view(request):
    return render(request, 'core/terms.html')
