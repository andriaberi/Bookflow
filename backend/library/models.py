from django.db import models
from django.utils.text import slugify


class Book(models.Model):
    title       = models.CharField(max_length=300)
    slug        = models.SlugField(max_length=300, unique=True, allow_unicode=True)
    author      = models.CharField(max_length=200, blank=True)
    language    = models.CharField(max_length=20, blank=True, help_text='e.g. "ka" or "en"')
    description = models.TextField(blank=True)

    cover       = models.ImageField(upload_to="library/covers/", blank=True)
    epub        = models.FileField(upload_to="library/epub/")

    is_published = models.BooleanField(default=True)
    order        = models.PositiveIntegerField(default=0)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return f"{self.title} — {self.author}" if self.author else self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            # allow_unicode keeps Georgian titles readable in URLs
            self.slug = slugify(self.title, allow_unicode=True)
        super().save(*args, **kwargs)
