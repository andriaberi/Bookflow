import uuid

from django.db import models


class Conversion(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("done",    "Done"),
        ("failed",  "Failed"),
    ]

    # Public id, so conversions can't be guessed by counting
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    pdf      = models.FileField(upload_to="conversions/pdf/")
    epub     = models.FileField(upload_to="conversions/epub/", blank=True)

    # Options passed to the engine; blank means "find it in the PDF"
    title    = models.CharField(max_length=300, blank=True)
    author   = models.CharField(max_length=200, blank=True)
    language = models.CharField(max_length=20, blank=True)
    pages    = models.CharField(max_length=100, blank=True, help_text='Page range, e.g. "5-120"')

    status   = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    error    = models.TextField(blank=True)

    # What the engine found
    headings   = models.PositiveIntegerField(default=0)
    paragraphs = models.PositiveIntegerField(default=0)
    notes      = models.PositiveIntegerField(default=0)

    created_at  = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.pdf.name} ({self.status})"
