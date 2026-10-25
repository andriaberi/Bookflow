from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie


# Sets the csrftoken cookie the frontend sends back on POST /api/convert/
@ensure_csrf_cookie
def index(request):
    return render(request, "index.html")
