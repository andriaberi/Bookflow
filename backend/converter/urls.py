from django.urls import path

from .views import book, conversion_create, conversion_detail, csrf, epub, page

urlpatterns = [
    path("", conversion_create, name="conversion-create"),
    path("csrf", csrf, name="csrf"),
    path("<uuid:pk>", conversion_detail, name="conversion-detail"),
    path("<uuid:pk>/book", book, name="conversion-book"),
    path("<uuid:pk>/pages/<int:number>.png", page, name="conversion-page"),
    path("<uuid:pk>/epub", epub, name="conversion-epub"),
]
