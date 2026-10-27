from django.core.files.base import ContentFile
from django.db import models
from django.utils.text import slugify


class Book(models.Model):
    title       = models.CharField(max_length=300)
    slug        = models.SlugField(max_length=300, unique=True, allow_unicode=True)
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

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.free_slug()
        super().save(*args, **kwargs)

    def free_slug(self) -> str:
        """The title as a slug, numbered if another book has it. allow_unicode keeps
        Georgian titles readable in URLs."""
        base = slugify(self.title, allow_unicode=True) or "book"
        taken = set(Book.objects.exclude(pk=self.pk).filter(slug__startswith=base).values_list("slug", flat=True))
        slug, number = base, 1
        while slug in taken:
            number += 1
            slug = f"{base}-{number}"
        return slug

    def set_epub(self, epub: bytes) -> None:
        """Replace the EPUB file with this one."""
        if self.epub:
            self.epub.delete(save=False)
        self.epub = ContentFile(epub, name=f"{slugify(self.title, allow_unicode=True) or 'book'}.epub")
