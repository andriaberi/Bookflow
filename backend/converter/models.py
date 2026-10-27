import uuid

from django.db import models
from django.utils import timezone


def pdf_path(conversion, filename):
    return f"conversions/{conversion.id}/{filename}"


def cover_path(conversion, filename):
    return f"conversions/{conversion.id}/cover.jpg"


class Conversion(models.Model):
    STATUS_CHOICES = [
        ("reading", "Reading"),
        ("ready",   "Ready"),
        ("failed",  "Failed"),
    ]

    # Public id, so conversions can't be guessed by counting
    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    pdf    = models.FileField(upload_to=pdf_path)
    name   = models.CharField(max_length=255, help_text="The PDF's file name, without .pdf")
    size   = models.PositiveBigIntegerField(help_text="In bytes")
    pages  = models.PositiveIntegerField()

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="reading")
    # Which of pdf2epub's reading steps is running, from 0
    step   = models.PositiveSmallIntegerField(default=0)
    error  = models.TextField(blank=True)

    # The book as pdf2epub's Book.to_dict() gives it, without the cover image
    book   = models.JSONField(null=True, blank=True)
    cover  = models.FileField(upload_to=cover_path, blank=True)

    # When the page using it last said it's open; see cleanup.py
    last_seen  = models.DateTimeField(default=timezone.now)
    keep       = models.BooleanField(default=False, help_text="Never deleted for being left (the admin's own)")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"
