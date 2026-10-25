"""The one place Bookflow talks to PDF2EPUB."""

import logging
import threading

import pymupdf
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import connection
from pdf2epub import STEPS, ConvertError, Options, read_book

from .models import Conversion

log = logging.getLogger(__name__)

# The steps read_book() reports; writing the EPUB comes later, on download.
READING_STEPS = STEPS[:3]


def count_pages(data: bytes) -> int:
    """The PDF's page count; ValueError if it can't be opened as a PDF."""
    try:
        with pymupdf.open(stream=data, filetype="pdf") as doc:
            return doc.page_count
    except (pymupdf.FileDataError, RuntimeError) as e:
        raise ValueError(str(e)) from None


def start(conversion: Conversion) -> None:
    """Read the book in the background, or right away when settings say so (tests)."""
    if settings.CONVERTER_BACKGROUND:
        threading.Thread(target=read, args=(conversion.pk,), daemon=True).start()
    else:
        read(conversion.pk)


def read(pk) -> None:
    """Find the book in the PDF and save it on the conversion, or the error."""
    try:
        conversion = Conversion.objects.get(pk=pk)

        def progress(step: str) -> None:
            if step in READING_STEPS:
                Conversion.objects.filter(pk=pk).update(step=READING_STEPS.index(step))

        try:
            book = read_book(Options(pdf=conversion.pdf.path), progress)
        except ConvertError as e:
            conversion.status = "failed"
            conversion.error = str(e)
        else:
            data = book.to_dict()
            # The cover is kept as an image file, not as base64 in the JSON.
            data["cover"] = None
            if book.cover:
                conversion.cover.save("cover.jpg", ContentFile(book.cover.data), save=False)
            conversion.book = data
            conversion.status = "ready"
            conversion.step = len(READING_STEPS) - 1
        conversion.save()
    except Exception:
        log.exception("reading conversion %s failed", pk)
        Conversion.objects.filter(pk=pk).update(status="failed", error="Something went wrong while reading the book.")
    finally:
        # A thread has its own database connection; close it when done.
        if settings.CONVERTER_BACKGROUND:
            connection.close()
