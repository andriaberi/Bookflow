from django.contrib import admin

from . import models


@admin.register(models.Message)
class MessageAdmin(admin.ModelAdmin):
    list_display    = ("__str__", "kind", "email", "is_read", "created_at")
    list_filter     = ("is_read", "kind")
    list_editable   = ("is_read",)
    search_fields   = ("name", "email", "link", "text")
    readonly_fields = ("kind", "name", "email", "link", "text", "created_at")
