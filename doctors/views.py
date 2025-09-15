from django.shortcuts import render

def doctor_profile(request, slug):
    return render(request, "doctors/profile.html", {"slug": slug})
