from django.urls import path

from .views import book_detail, book_list

urlpatterns = [
    path("", book_list, name="book-list"),
    path("<str:slug>", book_detail, name="book-detail"),
]
