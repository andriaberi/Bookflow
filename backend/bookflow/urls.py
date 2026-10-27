from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from .views import index, info

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/info", info, name="info"),
    path("api/convert/", include("converter.urls")),
    path("api/library/", include("library.urls")),
    path("api/contact/", include("contact.urls")),
]

# Serve uploads in development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Frontend catch-all MUST be last
urlpatterns += [
    re_path(r"^(?!api/|admin/|media/|static/).*$", index, name="frontend"),
]
