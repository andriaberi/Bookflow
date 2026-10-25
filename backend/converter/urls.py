from django.urls import path

from .views import conversion_create, conversion_detail, csrf

urlpatterns = [
    path("", conversion_create, name="conversion-create"),
    path("csrf", csrf, name="csrf"),
    path("<uuid:pk>", conversion_detail, name="conversion-detail"),
]
