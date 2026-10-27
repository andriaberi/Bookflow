from converter import engine
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import Book


def _serialize(b: Book) -> dict:
    return {
        "title":       b.title,
        "id":          str(b.uid),
        "author":      b.author,
        "language":    b.language,
        "description": b.description,
        "cover_url":   b.cover.url if b.cover else None,
        "epub_url":    b.epub.url if b.epub else None,
        "epub_size":   b.epub.size if b.epub else None,
        # Known only for books kept with their data
        "chapters":    engine.counts(b.data)["headings"] if b.data else None,
    }


@require_GET
def book_list(request):
    data = [_serialize(b) for b in Book.objects.filter(is_published=True)]
    return JsonResponse(data, safe=False)


@require_GET
def book_detail(request, uid):
    book = get_object_or_404(Book, uid=uid, is_published=True)
    return JsonResponse(_serialize(book))
