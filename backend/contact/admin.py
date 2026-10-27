from django.contrib import admin

from . import models


@admin.register(models.Message)
class MessageAdmin(admin.ModelAdmin):
    list_display    = ("__str__", "email", "is_read", "created_at")
    list_filter     = ("is_read",)
    list_editable   = ("is_read",)
    search_fields   = ("name", "email", "text")
    readonly_fields = ("name", "email", "text", "created_at")
