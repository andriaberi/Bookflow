from bookflow import mail, public
from bookflow.responses import error
from converter import engine
from converter.uploads import UploadError, check_pdf
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
LANGS = {"en", "ka"}


@require_POST
@public.limited("suggestion")
def suggestion_create(request):
    fields = public.fields(request, "title", "author", "note", "rights", "holder", "email")
    if not fields["title"]:
        return error("no_title", "The book's title is needed")
    if len(fields["title"]) > 300 or max(len(fields["author"]), len(fields["holder"])) > 200 or len(fields["note"]) > MAX_NOTE:
        return error("too_long", f"Notes up to {MAX_NOTE} characters")
    if fields["email"] and not public.is_email(fields["email"]):
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
    if fields["rights"] != "permission":
        fields["holder"] = ""
    elif not fields["holder"]:
        return error("no_holder", "Say who holds the rights")

    lang = request.POST.get("lang")
    suggestion = Suggestion.objects.create(pdf=pdf or "", lang=lang if lang in LANGS else "en", **fields)
    lines = [
        f"{suggestion.title}" + (f" — {suggestion.author}" if suggestion.author else ""),
        suggestion.note,
        f"PDF: {suggestion.get_rights_display()}" + (f" ({suggestion.holder})" if suggestion.holder else "") if suggestion.pdf else "No PDF",
        mail.admin_url(suggestion),
    ]
    mail.notify(f"Book suggested: {suggestion.title}", "\n\n".join(line for line in lines if line), reply_to=suggestion.email)
    return public.created()
