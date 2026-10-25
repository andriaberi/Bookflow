from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from . import engine
from .models import Conversion

PDF_START = b"%PDF-"


def _error(code: str, detail: str, status: int = 400) -> JsonResponse:
    """An error the frontend shows in the page's language: it translates `code`."""
    return JsonResponse({"error": code, "detail": detail}, status=status)


def _summary(book: dict) -> dict:
    """What the reading page shows once the book is found."""
    blocks = [block for block in book["blocks"] if block["include"]]
    return {
        "title":      book["metadata"]["title"],
        "author":     book["metadata"]["author"],
        "language":   book["metadata"]["language"],
        "headings":   sum(1 for block in blocks if block["type"] == "heading"),
        "paragraphs": sum(1 for block in blocks if block["type"] == "text"),
        "notes":      len(book["notes"]) if book["include_notes"] else 0,
    }


def _serialize(c: Conversion) -> dict:
    return {
        "id":         str(c.id),
        "name":       c.name,
        "size":       c.size,
        "pages":      c.pages,
        "status":     c.status,
        "step":       c.step,
        "steps":      len(engine.READING_STEPS),
        "error":      c.error,
        "cover_url":  c.cover.url if c.cover else None,
        "book":       _summary(c.book) if c.book else None,
        "created_at": c.created_at.isoformat(),
    }


# The React dev server doesn't come from Django, so it asks here for the CSRF cookie.
@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({})


@require_POST
def conversion_create(request):
    pdf = request.FILES.get("pdf")
    if not pdf:
        return _error("no_file", "No PDF uploaded")
    if pdf.size > settings.MAX_PDF_SIZE_MB * 1024 * 1024:
        return _error("too_big", f"PDFs up to {settings.MAX_PDF_SIZE_MB} MB only")

    data = pdf.read()
    if not data.startswith(PDF_START):
        return _error("not_pdf", "The file isn't a PDF")
    try:
        pages = engine.count_pages(data)
    except ValueError as e:
        return _error("unreadable", f"The PDF can't be opened: {e}")
    if pages == 0:
        return _error("unreadable", "The PDF has no pages")

    pdf.seek(0)
    conversion = Conversion.objects.create(
        pdf=pdf,
        name=Path(pdf.name).stem,
        size=pdf.size,
        pages=pages,
    )
    engine.start(conversion)
    conversion.refresh_from_db()

    return JsonResponse(_serialize(conversion), status=201)


@require_GET
def conversion_detail(request, pk):
    conversion = get_object_or_404(Conversion, pk=pk)
    return JsonResponse(_serialize(conversion))
