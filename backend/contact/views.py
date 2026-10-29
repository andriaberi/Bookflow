from bookflow import mail, public
from bookflow.responses import error
from django.views.decorators.http import require_POST
from library.views import suggestion_create

from .models import Message

# The longest message, in characters
MAX_TEXT = 5000
KINDS = {kind for kind, _ in Message.KIND_CHOICES}
SUBJECTS = {
    "message":   "Message from {sender}",
    "problem":   "Problem reported by {sender}",
    "copyright": "Copyright concern from {sender}",
}


# Everything the contact page sends: a suggested book, or a message of some kind.
@require_POST
def contact_create(request):
    kind = request.POST.get("kind", "message")
    if kind == "book":
        return suggestion_create(request)
    if kind not in KINDS:
        return error("bad_kind", "Not something the contact page sends")
    return message_create(request, kind)


@public.limited("message")
def message_create(request, kind):
    fields = public.fields(request, "name", "email", "link", "text")
    if not fields["text"]:
        return error("no_text", "The message is empty")
    if public.too_long(fields, Message, text=MAX_TEXT):
        return error("too_long", f"Messages up to {MAX_TEXT} characters")
    if fields["email"] and not public.is_email(fields["email"]):
        return error("bad_email", "That isn't an email address")
    if kind == "message":
        fields["link"] = ""
    # A copyright concern needs an answer, and to know which book.
    if kind == "copyright" and not fields["link"]:
        return error("no_link", "Say which book")
    if kind == "copyright" and not fields["email"]:
        return error("no_email", "An email address is needed to answer")

    message = Message.objects.create(kind=kind, **fields)
    sender = message.name or message.email or "Someone"
    about = f"About: {message.link}\n\n" if message.link else ""
    mail.notify(
        SUBJECTS[kind].format(sender=sender),
        f"{about}{message.text}\n\n— {sender} {message.email}\n{mail.admin_url(message)}",
        reply_to=message.email,
    )
    return public.created()
