"""The one place Bookflow talks to PDF2EPUB."""

import io
import logging
import os
import threading
import zipfile
from pathlib import Path

import pymupdf
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import connection
from pdf2epub import STEPS, Book, ConvertError, HeadingBlock, Options, read_book, render_page, write_book
from pdf2epub.book import GIVEN_COVER, NO_COVER
from pdf2epub.cover import load_cover
from pdf2epub.epub.writer import split_long

from .models import Conversion, Total

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
        if conversion.status == "ready":
            Total.add(Total.CONVERTED)
    except Exception:
        log.exception("reading conversion %s failed", pk)
        Conversion.objects.filter(pk=pk).update(status="failed", error="Something went wrong while reading the book.")
    finally:
        # A thread has its own database connection; close it when done.
        if settings.CONVERTER_BACKGROUND:
            connection.close()


def load_book(data: dict, cover=None) -> Book:
    """The book in `data`, with the image in the file field `cover` as its cover;
    ConvertError if the data isn't a book."""
    book = Book.from_dict(data)
    if cover:
        with cover.open("rb") as f:
            book.cover = load_cover(f.read())
    return book


def take_cover(data: dict) -> tuple[dict, bytes | None]:
    """The book data without its cover image, kept as a file instead, and that image as
    JPEG if it has one; ConvertError if the data isn't a book."""
    book = Book.from_dict(data)
    return {**data, "cover": None}, book.cover.data if book.cover else None


def counts(data: dict) -> dict:
    """How many headings, paragraphs and notes of the book data go into the EPUB."""
    blocks = [block for block in data["blocks"] if block["include"]]
    return {
        "headings":   sum(1 for block in blocks if block["type"] == "heading"),
        "paragraphs": sum(1 for block in blocks if block["type"] == "text"),
        "notes":      len(data["notes"]) if data["include_notes"] else 0,
    }


def book_of(conversion: Conversion) -> Book:
    """The conversion's book, as last saved, with its cover image put back."""
    return load_book(conversion.book, conversion.cover)


def save_book(conversion: Conversion, data: dict) -> list[str]:
    """Save the edited book; ConvertError if the data isn't a book. Returns its problems:
    what would keep it from being written, empty if nothing does. The cover is the
    server's to change (set_cover, remove_cover), so its source is kept as it was."""
    data = {**data, "cover": None, "cover_source": conversion.book["cover_source"]}
    book = Book.from_dict(data)
    conversion.book = data
    conversion.save(update_fields=["book", "updated_at"])
    return book.problems()


def epub_bytes(book: Book) -> bytes:
    """The book written as an EPUB; ConvertError if it has problems to fix first."""
    buffer = io.BytesIO()
    write_book(book, buffer)
    return buffer.getvalue()


def epub_of(conversion: Conversion) -> bytes:
    return epub_bytes(book_of(conversion))


def page_image(conversion: Conversion, number: int, width: int) -> bytes:
    """Page `number` of the PDF, from 1, as a PNG `width` pixels wide."""
    return render_page(conversion.pdf.path, number, width)


def set_cover(conversion: Conversion, image: bytes) -> None:
    """Use this image as the cover; CoverError if it isn't one. Saved as JPEG."""
    _change_cover(conversion, load_cover(image).data, GIVEN_COVER)


def remove_cover(conversion: Conversion) -> None:
    _change_cover(conversion, None, NO_COVER)


def _change_cover(conversion: Conversion, jpeg: bytes | None, source: str) -> None:
    if conversion.cover:
        conversion.cover.delete(save=False)
    if jpeg:
        conversion.cover.save("cover.jpg", ContentFile(jpeg), save=False)
    conversion.book = {**conversion.book, "cover_source": source}
    conversion.save()


def preview_epub(conversion: Conversion) -> Path:
    """The book written as an EPUB for the editor's preview, kept next to the PDF and
    written again only after the book has changed. ConvertError if it has problems."""
    path = Path(conversion.pdf.path).with_name("preview.epub")
    if not path.exists() or path.stat().st_mtime < conversion.updated_at.timestamp():
        written = path.with_name("preview.epub.part")
        written.write_bytes(epub_of(conversion))
        os.replace(written, path)
    return path


def preview_page(conversion: Conversion, block_id: str | None) -> str:
    """The EPUB page block `block_id` is written on, as a path inside the EPUB. A block
    left out of the EPUB shows the page of the last included block before it.

    The engine writes one page per included section, a section starting at each heading
    (and one before the first heading when included text comes first); a long section
    goes over several pages, so its paragraphs are counted the way the engine splits them.
    """
    book = Book.from_dict(conversion.book)
    first_file = []  # each section's first page number, from 1
    parts_of = []  # each section's pages, as how many paragraphs each holds
    number = 1
    for section in book.sections():
        parts = [len(part.paragraphs) for part in split_long(section)]
        first_file.append(number)
        parts_of.append(parts)
        number += len(parts)

    def file_of(section: int, paragraph: int | None) -> int:
        if paragraph is None:
            return first_file[section]
        for part, size in enumerate(parts_of[section]):
            if paragraph < size:
                return first_file[section] + part
            paragraph -= size
        return first_file[section] + len(parts_of[section]) - 1

    section, paragraph = -1, None
    found = 1
    for block in book.blocks:
        if block.include:
            if isinstance(block, HeadingBlock):
                section, paragraph = section + 1, None
            else:
                section = max(section, 0)
                paragraph = 0 if paragraph is None else paragraph + 1
        if block.id == block_id:
            if section >= 0:
                found = file_of(section, paragraph)
            break
    return f"EPUB/text/section-{found:04}.xhtml"


CONTENT_TYPES = {
    ".xhtml": "application/xhtml+xml",
    ".css": "text/css",
    ".ttf": "font/ttf",
    ".jpg": "image/jpeg",
    ".ncx": "application/x-dtbncx+xml",
    ".opf": "application/oebps-package+xml",
}


def preview_file(conversion: Conversion, name: str) -> tuple[bytes, str]:
    """A file from inside the preview EPUB and its type; KeyError if there's none."""
    with zipfile.ZipFile(preview_epub(conversion)) as epub:
        data = epub.read(name)
    return data, CONTENT_TYPES.get(Path(name).suffix, "application/octet-stream")
