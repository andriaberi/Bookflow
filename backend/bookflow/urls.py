from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from .views import csrf, index, info

admin.site.site_header = "Bookflow Admin"
admin.site.site_title = "Bookflow"
admin.site.index_title = "Content management"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/info", info, name="info"),
    path("api/csrf", csrf, name="csrf"),
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
