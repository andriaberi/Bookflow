from django.db import models


class Message(models.Model):
    KIND_CHOICES = [
        ("message",   "Message"),
        ("problem",   "Problem"),
        ("copyright", "Copyright concern"),
    ]

    kind       = models.CharField(max_length=10, choices=KIND_CHOICES, default="message")
    name       = models.CharField(max_length=200, blank=True)
    email      = models.EmailField(blank=True, help_text="To answer them")
    # The page or book a problem or copyright concern is about
    link       = models.CharField(max_length=500, blank=True)
    text       = models.TextField()

    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name or self.email or 'Someone'}: {self.text[:60]}"
