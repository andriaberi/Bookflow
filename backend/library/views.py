from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import Book


def _serialize(b: Book) -> dict:
    return {
        "title":       b.title,
        "slug":        b.slug,
        "author":      b.author,
        "language":    b.language,
        "description": b.description,
        "cover_url":   b.cover.url if b.cover else None,
        "epub_url":    b.epub.url,
    }


@require_GET
def book_list(request):
    data = [_serialize(b) for b in Book.objects.filter(is_published=True)]
    return JsonResponse(data, safe=False)


@require_GET
def book_detail(request, slug):
    book = get_object_or_404(Book, slug=slug, is_published=True)
    return JsonResponse(_serialize(book))
