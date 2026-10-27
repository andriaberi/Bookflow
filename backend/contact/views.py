from bookflow import mail, public
from bookflow.responses import error
from django.views.decorators.http import require_POST

from .models import Message

# The longest message, in characters
MAX_TEXT = 5000


@require_POST
@public.limited("message")
def message_create(request):
    fields = public.fields(request, "name", "email", "text")
    if not fields["text"]:
        return error("no_text", "The message is empty")
    if len(fields["name"]) > 200 or len(fields["text"]) > MAX_TEXT:
        return error("too_long", f"Messages up to {MAX_TEXT} characters")
    if fields["email"] and not public.is_email(fields["email"]):
        return error("bad_email", "That isn't an email address")

    message = Message.objects.create(**fields)
    sender = message.name or message.email or "Someone"
    mail.notify(
        f"Message from {sender}",
        f"{message.text}\n\n— {sender} {message.email}\n{mail.admin_url(message)}",
        reply_to=message.email,
    )
    return public.created()
