from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST

from . import engine
from .models import Conversion


def _serialize(c: Conversion) -> dict:
    return {
        "id":         str(c.id),
        "status":     c.status,
        "error":      c.error,
        "title":      c.title,
        "author":     c.author,
        "epub_url":   c.epub.url if c.epub else None,
        "headings":   c.headings,
        "paragraphs": c.paragraphs,
        "notes":      c.notes,
        "created_at": c.created_at.isoformat(),
    }


@require_POST
def conversion_create(request):
    pdf = request.FILES.get("pdf")
    if not pdf:
        return JsonResponse({"error": "No PDF uploaded"}, status=400)
    if not pdf.name.lower().endswith(".pdf"):
        return JsonResponse({"error": "The file must be a PDF"}, status=400)
    if pdf.size > settings.MAX_PDF_SIZE_MB * 1024 * 1024:
        return JsonResponse({"error": f"PDFs up to {settings.MAX_PDF_SIZE_MB} MB only"}, status=400)

    conversion = Conversion.objects.create(
        pdf=pdf,
        title=request.POST.get("title", ""),
        author=request.POST.get("author", ""),
        language=request.POST.get("language", ""),
        pages=request.POST.get("pages", ""),
    )

    # Runs in the request for now; move to a background worker when books get big
    engine.run(conversion)

    return JsonResponse(_serialize(conversion), status=201)


@require_GET
def conversion_detail(request, pk):
    conversion = get_object_or_404(Conversion, pk=pk)
    return JsonResponse(_serialize(conversion))
