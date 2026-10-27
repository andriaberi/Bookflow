"""Checks on an uploaded PDF, shared by the converter and book suggestions."""

from django.conf import settings

from . import engine

PDF_START = b"%PDF-"
MB = 1024 * 1024


class UploadError(Exception):
    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code


def check_pdf(pdf) -> int:
    """The uploaded PDF's page count; UploadError if it's too big, isn't a PDF or can't
    be opened."""
    if pdf.size > settings.MAX_PDF_SIZE_MB * MB:
        raise UploadError("too_big", f"PDFs up to {settings.MAX_PDF_SIZE_MB} MB only")
    data = pdf.read()
    pdf.seek(0)
    if not data.startswith(PDF_START):
        raise UploadError("not_pdf", "The file isn't a PDF")
    try:
        pages = engine.count_pages(data)
    except ValueError as e:
        raise UploadError("unreadable", f"The PDF can't be opened: {e}") from None
    if pages == 0:
        raise UploadError("unreadable", "The PDF has no pages")
    return pages
