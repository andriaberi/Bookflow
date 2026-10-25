from django.urls import path

from .views import conversion_create, conversion_detail

urlpatterns = [
    path("", conversion_create, name="conversion-create"),
    path("<uuid:pk>", conversion_detail, name="conversion-detail"),
]
