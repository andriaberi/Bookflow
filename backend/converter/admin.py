from django.contrib import admin

from . import models


@admin.register(models.Conversion)
class ConversionAdmin(admin.ModelAdmin):
    list_display    = ("pdf", "title", "status", "headings", "paragraphs", "created_at")
    list_filter     = ("status",)
    search_fields   = ("pdf", "title", "author")
    readonly_fields = ("id", "status", "error", "headings", "paragraphs", "notes",
                       "created_at", "finished_at")

    fieldsets = (
        ("Files", {
            "fields": ("id", "pdf", "epub")
        }),
        ("Options", {
            "fields": ("title", "author", "language", "pages")
        }),
        ("Result", {
            "fields": ("status", "error", "headings", "paragraphs", "notes",
                       "created_at", "finished_at")
        }),
    )
