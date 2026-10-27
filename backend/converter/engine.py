"""The one place Bookflow talks to PDF2EPUB."""

import io
import logging
import threading

import pymupdf
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import connection
from pdf2epub import STEPS, Book, ConvertError, Options, read_book, render_page, write_book
from pdf2epub.book import GIVEN_COVER, NO_COVER
from pdf2epub.cover import load_cover

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


def book_of(conversion: Conversion) -> Book:
    """The conversion's book, as last saved, with its cover image put back."""
    book = Book.from_dict(conversion.book)
    if conversion.cover:
        with conversion.cover.open("rb") as f:
            book.cover = load_cover(f.read())
    return book


def save_book(conversion: Conversion, data: dict) -> list[str]:
    """Save the edited book; ConvertError if the data isn't a book. Returns its problems:
    what would keep it from being written, empty if nothing does. The cover is the
    server's to change (set_cover, remove_cover), so its source is kept as it was."""
    data = {**data, "cover": None, "cover_source": conversion.book["cover_source"]}
    book = Book.from_dict(data)
    conversion.book = data
    conversion.save(update_fields=["book", "updated_at"])
    return book.problems()


def epub_of(conversion: Conversion) -> bytes:
    """The book written as an EPUB; ConvertError if it has problems to fix first."""
    buffer = io.BytesIO()
    write_book(book_of(conversion), buffer)
    return buffer.getvalue()


def page_image(conversion: Conversion, number: int, width: int) -> bytes:
    """Page `number` of the PDF, from 1, as a PNG `width` pixels wide."""
    return render_page(conversion.pdf.path, number, width)


def set_cover(conversion: Conversion, image: bytes) -> None:
    """Use this image as the cover; CoverError if it isn't one. Saved as JPEG."""
    cover = load_cover(image)
    if conversion.cover:
        conversion.cover.delete(save=False)
    conversion.cover.save("cover.jpg", ContentFile(cover.data), save=False)
    conversion.book = {**conversion.book, "cover_source": GIVEN_COVER}
    conversion.save()


def remove_cover(conversion: Conversion) -> None:
    """Leave the book without a cover."""
    if conversion.cover:
        conversion.cover.delete(save=False)
    conversion.book = {**conversion.book, "cover_source": NO_COVER}
    conversion.save()
