# Conversions now keep the book read from the PDF, for the editor, instead of a
# finished EPUB. Old conversions were test uploads, so the table starts over.

import uuid

from django.db import migrations, models

import converter.models


class Migration(migrations.Migration):

    dependencies = [
        ("converter", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Conversion",
        ),
        migrations.CreateModel(
            name="Conversion",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("pdf", models.FileField(upload_to=converter.models.pdf_path)),
                ("name", models.CharField(help_text="The PDF's file name, without .pdf", max_length=255)),
                ("size", models.PositiveBigIntegerField(help_text="In bytes")),
                ("pages", models.PositiveIntegerField()),
                ("status", models.CharField(choices=[("reading", "Reading"), ("ready", "Ready"), ("failed", "Failed")], default="reading", max_length=10)),
                ("step", models.PositiveSmallIntegerField(default=0)),
                ("error", models.TextField(blank=True)),
                ("book", models.JSONField(blank=True, null=True)),
                ("cover", models.FileField(blank=True, upload_to=converter.models.cover_path)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
