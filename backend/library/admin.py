from converter import engine
from django.contrib import admin

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
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields     = ("contents", "created_at")

    fieldsets = (
        ("Basic Info", {
            "description": "Left blank, the title, author and language come from the book data.",
            "fields": ("title", "slug", "author", "language", "description")
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
