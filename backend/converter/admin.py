from django.contrib import admin

from . import models


@admin.register(models.Conversion)
class ConversionAdmin(admin.ModelAdmin):
    list_display    = ("name", "status", "pages", "size", "created_at")
    list_filter     = ("status",)
    search_fields   = ("name",)
    readonly_fields = ("id", "name", "size", "pages", "status", "step", "error",
                       "created_at", "updated_at")
    exclude         = ("book",)

    fieldsets = (
        ("Files", {
            "fields": ("id", "pdf", "cover")
        }),
        ("PDF", {
            "fields": ("name", "size", "pages")
        }),
        ("Reading", {
            "fields": ("status", "step", "error", "created_at", "updated_at")
        }),
    )
