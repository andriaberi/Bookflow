from bookflow.responses import error
from converter import engine
from converter.uploads import UploadError, check_pdf
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST

from .models import Book, Suggestion


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


# The longest note a suggestion may have, in characters
MAX_NOTE = 2000
RIGHTS = {choice for choice, _ in Suggestion.RIGHTS_CHOICES}


@require_POST
def suggestion_create(request):
    fields = {name: request.POST.get(name, "").strip() for name in ("title", "author", "note", "rights", "email")}
    # A field people never see: only bots fill it in. They're told it worked.
    if request.POST.get("website"):
        return JsonResponse({}, status=201)

    if not fields["title"]:
        return error("no_title", "The book's title is needed")
    if len(fields["title"]) > 300 or len(fields["author"]) > 200 or len(fields["note"]) > MAX_NOTE:
        return error("too_long", f"Notes up to {MAX_NOTE} characters")
    if fields["email"]:
        try:
            validate_email(fields["email"])
        except ValidationError:
            return error("bad_email", "That isn't an email address")

    pdf = request.FILES.get("pdf")
    if pdf:
        try:
            check_pdf(pdf)
        except UploadError as e:
            return error(e.code, str(e))
        if fields["rights"] not in RIGHTS:
            return error("no_rights", "Say whether the PDF may be shared")
    else:
        fields["rights"] = ""

    Suggestion.objects.create(pdf=pdf or "", **fields)
    return JsonResponse({}, status=201)
