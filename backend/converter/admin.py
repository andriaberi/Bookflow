from django.contrib import admin, messages
from django.core.files.base import ContentFile
from library.models import Book
from pdf2epub import ConvertError

from . import engine, models


@admin.register(models.Conversion)
class ConversionAdmin(admin.ModelAdmin):
    list_display    = ("name", "status", "pages", "size", "keep", "last_seen", "created_at")
    list_filter     = ("status", "keep")
    list_editable   = ("keep",)
    search_fields   = ("name",)
    readonly_fields = ("id", "name", "size", "pages", "status", "step", "error",
                       "last_seen", "created_at", "updated_at")
    exclude         = ("book",)
    actions         = ("add_to_library",)

    fieldsets = (
        ("Files", {
            "fields": ("id", "pdf", "cover")
        }),
        ("PDF", {
            "fields": ("name", "size", "pages")
        }),
        ("Reading", {
            "fields": ("status", "step", "error", "keep", "last_seen", "created_at", "updated_at")
        }),
    )

    @admin.action(description="Add to the library, unpublished")
    def add_to_library(self, request, queryset):
        for conversion in queryset:
            if conversion.status != "ready":
                self.message_user(request, f"{conversion.name}: the book hasn't been read.", messages.ERROR)
                continue
            try:
                epub = engine.epub_of(conversion)
            except ConvertError as e:
                self.message_user(request, f"{conversion.name}: {e}", messages.ERROR)
                continue
            metadata = conversion.book["metadata"]
            book = Book(
                title=metadata["title"] or conversion.name,
                author=metadata["author"] or "",
                language=metadata["language"] or "",
                data=conversion.book,
                is_published=False,
            )
            if conversion.cover:
                with conversion.cover.open("rb") as f:
                    book.cover = ContentFile(f.read(), name="cover.jpg")
            book.set_epub(epub)
            book.save()
            self.message_user(request, f"{book.title} is in the library, unpublished.", messages.SUCCESS)


@admin.register(models.Total)
class TotalAdmin(admin.ModelAdmin):
    list_display = ("name", "count")
