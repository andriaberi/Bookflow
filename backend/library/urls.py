from django.urls import path

from .views import book_detail, book_list, suggestion_create

urlpatterns = [
    path("", book_list, name="book-list"),
    path("<uuid:uid>", book_detail, name="book-detail"),
    path("suggestions", suggestion_create, name="suggestion-create"),
]
