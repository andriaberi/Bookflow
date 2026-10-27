import json
from functools import wraps
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from pdf2epub import ConvertError

from . import engine
from .models import Conversion

PDF_START = b"%PDF-"
MB = 1024 * 1024
MAX_COVER_MB = 10

# Widths the page preview may ask for, in pixels
PAGE_WIDTHS = range(100, 1601)


def _error(code: str, detail: str, status: int = 400) -> JsonResponse:
    """An error the frontend shows in the page's language: it translates `code`."""
    return JsonResponse({"error": code, "detail": detail}, status=status)


def _summary(book: dict) -> dict:
    """What the reading page shows once the book is found."""
    return {
        "title":    book["metadata"]["title"],
        "author":   book["metadata"]["author"],
        "language": book["metadata"]["language"],
        **engine.counts(book),
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
    if pdf.size > settings.MAX_PDF_SIZE_MB * MB:
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


def _ready(view):
    """Passes the view the conversion once its book has been read; until then, 409."""
    @wraps(view)
    def wrapper(request, pk, **kwargs):
        conversion = get_object_or_404(Conversion, pk=pk)
        if conversion.status != "ready":
            return _error("not_ready", "The book hasn't been read yet", status=409)
        return view(request, conversion, **kwargs)
    return wrapper


@require_http_methods(["GET", "PUT"])
@_ready
def book(request, conversion):
    """GET: the book to edit. PUT: save the edited book, and say what would keep it
    from being written."""
    if request.method == "GET":
        return JsonResponse({
            "book":      conversion.book,
            "name":      conversion.name,
            "pages":     conversion.pages,
            "cover_url": _cover_url(conversion),
        })

    try:
        data = json.loads(request.body)
    except ValueError:
        return _error("bad_book", "The book isn't JSON")
    if not isinstance(data, dict):
        return _error("bad_book", "The book must be an object")
    try:
        problems = engine.save_book(conversion, data)
    except ConvertError as e:
        return _error("bad_book", str(e))
    return JsonResponse({"problems": problems})


@require_GET
def page(request, pk, number):
    """A page of the PDF as a PNG, for the editor's preview."""
    conversion = get_object_or_404(Conversion, pk=pk)
    try:
        width = int(request.GET.get("width", 700))
    except ValueError:
        width = 0
    if width not in PAGE_WIDTHS:
        return _error("bad_width", f"Pages are {PAGE_WIDTHS.start} to {PAGE_WIDTHS.stop - 1} pixels wide")
    try:
        image = engine.page_image(conversion, number, width)
    except ConvertError as e:
        return _error("no_page", str(e), status=404)
    response = HttpResponse(image, content_type="image/png")
    # A PDF's pages never change, so the browser can keep them.
    response["Cache-Control"] = "private, max-age=86400"
    return response


@require_GET
@_ready
def epub(request, conversion):
    """The edited book as an EPUB file."""
    try:
        data = engine.epub_of(conversion)
    except ConvertError as e:
        return _error("problems", str(e))
    title = (conversion.book["metadata"].get("title") or conversion.name).strip() or "book"
    response = HttpResponse(data, content_type="application/epub+zip")
    response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(f'{title}.epub')}"
    return response


@require_http_methods(["POST", "DELETE"])
@_ready
def cover(request, conversion):
    """POST: replace the cover with an uploaded image. DELETE: remove the cover."""
    if request.method == "DELETE":
        engine.remove_cover(conversion)
        return JsonResponse({"cover_url": None})

    image = request.FILES.get("cover")
    if not image:
        return _error("no_file", "No image uploaded")
    if image.size > MAX_COVER_MB * MB:
        return _error("too_big", f"Covers up to {MAX_COVER_MB} MB only")
    try:
        engine.set_cover(conversion, image.read())
    except ConvertError:
        return _error("not_image", "The file isn't an image")
    return JsonResponse({"cover_url": _cover_url(conversion)})


def _cover_url(conversion: Conversion) -> str | None:
    """The cover's address, new each time it changes, so the browser never shows an old
    one from its cache."""
    if not conversion.cover:
        return None
    return f"{conversion.cover.url}?v={int(conversion.updated_at.timestamp())}"


@require_GET
@_ready
def preview(request, conversion):
    """Where the EPUB preview of a block is: the address of the EPUB page it's on."""
    try:
        name = engine.preview_page(conversion, request.GET.get("block"))
        engine.preview_epub(conversion)
    except ConvertError as e:
        return _error("problems", str(e), status=409)
    return JsonResponse({"url": f"/api/convert/{conversion.pk}/epub-files/{name}"})


# Shown in the editor's preview frame, which is on the same site.
@xframe_options_sameorigin
@require_GET
@_ready
def epub_file(request, conversion, name):
    """A file from inside the preview EPUB: a page, its stylesheet, fonts or cover."""
    try:
        data, content_type = engine.preview_file(conversion, name)
    except KeyError:
        return _error("not_found", "No such file in the EPUB", status=404)
    except ConvertError as e:
        return _error("problems", str(e), status=409)
    return HttpResponse(data, content_type=content_type)
