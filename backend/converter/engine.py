"""The one place Bookflow talks to PDF2EPUB."""

from pathlib import Path

from django.core.files import File
from django.utils import timezone
from pdf2epub import ConvertError, Options, convert

from .models import Conversion


def run(conversion: Conversion) -> Conversion:
    """Convert the conversion's PDF and save the EPUB, or the error, on it."""
    conversion.status = "running"
    conversion.save(update_fields=["status"])

    pdf = Path(conversion.pdf.path)
    output = pdf.with_suffix(".epub")
    options = Options(
        pdf=str(pdf),
        pages=conversion.pages or None,
        title=conversion.title or None,
        author=conversion.author or None,
        language=conversion.language or None,
    )

    try:
        result = convert(options, output)
    except ConvertError as e:
        conversion.status = "failed"
        conversion.error = str(e)
    else:
        with output.open("rb") as f:
            conversion.epub.save(output.name, File(f), save=False)
        output.unlink()
        conversion.status = "done"
        conversion.headings = result.headings
        conversion.paragraphs = result.paragraphs
        conversion.notes = result.notes

    conversion.finished_at = timezone.now()
    conversion.save()
    return conversion
