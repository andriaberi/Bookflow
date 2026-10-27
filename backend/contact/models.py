from django.db import models


class Message(models.Model):
    name       = models.CharField(max_length=200, blank=True)
    email      = models.EmailField(blank=True, help_text="To answer them")
    text       = models.TextField()

    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name or self.email or 'Someone'}: {self.text[:60]}"
