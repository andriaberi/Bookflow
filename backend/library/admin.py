from converter import engine
from converter.models import Conversion
from django.contrib import admin, messages
from django.core.files.base import ContentFile
from django.utils.html import format_html

from . import models
from .forms import BookForm

admin.site.site_header = "Bookflow Admin"
admin.site.site_title = "Bookflow"
admin.site.index_title = "Content management"


@admin.register(models.Book)
class BookAdmin(admin.ModelAdmin):
    form                = BookForm
    list_display        = ("title", "author", "language", "is_published", "order", "created_at")
    list_filter         = ("language", "is_published")
    list_editable       = ("is_published", "order")
    search_fields       = ("title", "author", "description")
    readonly_fields     = ("uid", "contents", "created_at")

    fieldsets = (
        ("Basic Info", {
            "description": "Left blank, the title, author and language come from the book data.",
            "fields": ("uid", "title", "author", "language", "description")
        }),
        ("Files", {
            "fields": ("data_file", "contents", "cover", "epub")
        }),
        ("Presentation", {
            "fields": ("is_published", "order", "created_at")
        }),
    )

    @admin.display(description="In the book data")
    def contents(self, book):
        if not book.data:
            return "No book data: the EPUB is the uploaded file."
        return "{headings} headings, {paragraphs} paragraphs, {notes} notes".format(**engine.counts(book.data))


@admin.register(models.Suggestion)
class SuggestionAdmin(admin.ModelAdmin):
    list_display    = ("title", "author", "has_pdf", "rights", "status", "created_at")
    list_filter     = ("status", "rights")
    list_editable   = ("status",)
    search_fields   = ("title", "author", "note", "email")
    readonly_fields = ("title", "author", "note", "pdf", "rights", "holder", "email", "created_at")
    actions         = ("convert",)

    @admin.display(boolean=True, description="PDF")
    def has_pdf(self, suggestion):
        return bool(suggestion.pdf)

    @admin.action(description="Read the PDF in the converter")
    def convert(self, request, queryset):
        for suggestion in queryset:
            if not suggestion.pdf:
                self.message_user(request, f"{suggestion.title}: no PDF was sent.", messages.ERROR)
                continue
            with suggestion.pdf.open("rb") as f:
                data = f.read()
            conversion = Conversion.objects.create(
                pdf=ContentFile(data, name=f"{suggestion.title}.pdf"),
                name=suggestion.title,
                size=len(data),
                pages=engine.count_pages(data),
                keep=True,
            )
            engine.start(conversion)
            link = format_html('<a href="/convert/{}">{}</a>', conversion.pk, suggestion.title)
            self.message_user(request, format_html("{} is being read in the converter.", link), messages.SUCCESS)
