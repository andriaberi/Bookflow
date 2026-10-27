import uuid

from django.core.files.base import ContentFile
from django.db import models
from django.utils.text import slugify


class Book(models.Model):
    # Public id, used in the book's address
    uid         = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title       = models.CharField(max_length=300)
    author      = models.CharField(max_length=200, blank=True)
    language    = models.CharField(max_length=20, blank=True, help_text='e.g. "ka" or "en"')
    description = models.TextField(blank=True)

    cover       = models.ImageField(upload_to="library/covers/", blank=True)
    epub        = models.FileField(upload_to="library/epub/", blank=True)
    # The book as pdf2epub's Book.to_dict() gives it, without the cover image. The EPUB
    # is written from it, so it can be written again with other settings.
    data        = models.JSONField(null=True, blank=True)

    is_published = models.BooleanField(default=True)
    order        = models.PositiveIntegerField(default=0)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return f"{self.title} — {self.author}" if self.author else self.title

    def set_epub(self, epub: bytes) -> None:
        """Replace the EPUB file with this one, named after the title (allow_unicode
        keeps Georgian titles readable)."""
        if self.epub:
            self.epub.delete(save=False)
        self.epub = ContentFile(epub, name=f"{slugify(self.title, allow_unicode=True) or 'book'}.epub")


def suggestion_path(suggestion, filename):
    return f"suggestions/{uuid.uuid4()}.pdf"


class Suggestion(models.Model):
    RIGHTS_CHOICES = [
        ("public_domain", "Public domain"),
        ("permission",    "Has the rights or permission"),
        ("unsure",        "Not sure"),
    ]
    STATUS_CHOICES = [
        ("new",      "New"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]

    title      = models.CharField(max_length=300)
    author     = models.CharField(max_length=200, blank=True)
    note       = models.TextField(blank=True)
    pdf        = models.FileField(upload_to=suggestion_path, blank=True)
    # Asked only when a PDF is sent
    rights     = models.CharField(max_length=20, choices=RIGHTS_CHOICES, blank=True)
    # Asked only of those with permission
    holder     = models.CharField(max_length=200, blank=True, help_text="Who holds the rights")
    email      = models.EmailField(blank=True, help_text="To tell them when the book is added")

    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default="new")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — {self.author}" if self.author else self.title
