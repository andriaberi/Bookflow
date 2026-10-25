import pdf2epub
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET


# Sets the csrftoken cookie the frontend sends back on POST /api/convert/
@ensure_csrf_cookie
def index(request):
    return render(request, "index.html")


# What the footer shows: the version of the engine actually installed.
@require_GET
def info(request):
    return JsonResponse({"engine": pdf2epub.__version__})
