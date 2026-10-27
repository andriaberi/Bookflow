from django.urls import path

from .views import (
    book, conversion_create, conversion_detail, conversion_left, conversion_seen, cover, epub, epub_file, page, preview,
)

urlpatterns = [
    path("", conversion_create, name="conversion-create"),
    path("<uuid:pk>", conversion_detail, name="conversion-detail"),
    path("<uuid:pk>/seen", conversion_seen, name="conversion-seen"),
    path("<uuid:pk>/left", conversion_left, name="conversion-left"),
    path("<uuid:pk>/book", book, name="conversion-book"),
    path("<uuid:pk>/pages/<int:number>.png", page, name="conversion-page"),
    path("<uuid:pk>/epub", epub, name="conversion-epub"),
    path("<uuid:pk>/cover", cover, name="conversion-cover"),
    path("<uuid:pk>/preview", preview, name="conversion-preview"),
    path("<uuid:pk>/epub-files/<path:name>", epub_file, name="conversion-epub-file"),
]
