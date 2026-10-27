import pdf2epub
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET


# The page sets the csrftoken cookie the frontend sends back on every post.
@ensure_csrf_cookie
def index(request):
    return render(request, "index.html")


# The React dev server doesn't come from Django, so it asks here for that cookie.
@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({})


# What the footer shows: the version of the engine actually installed.
@require_GET
def info(request):
    return JsonResponse({"engine": pdf2epub.__version__})
