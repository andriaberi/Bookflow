from django.urls import path

from .views import message_create

urlpatterns = [
    path("", message_create, name="message-create"),
]
