from django.contrib import admin

from . import models

admin.site.site_header = "Bookflow Admin"
admin.site.site_title = "Bookflow"
admin.site.index_title = "Content management"


@admin.register(models.Book)
class BookAdmin(admin.ModelAdmin):
    list_display        = ("title", "author", "language", "is_published", "order", "created_at")
    list_filter         = ("language", "is_published")
    list_editable       = ("is_published", "order")
    search_fields       = ("title", "author", "description")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields     = ("created_at",)

    fieldsets = (
        ("Basic Info", {
            "fields": ("title", "slug", "author", "language", "description")
        }),
        ("Files", {
            "fields": ("cover", "epub")
        }),
        ("Presentation", {
            "fields": ("is_published", "order", "created_at")
        }),
    )
