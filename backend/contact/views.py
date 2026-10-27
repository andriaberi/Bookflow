from bookflow.responses import error
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Message

# The longest message, in characters
MAX_TEXT = 5000


@require_POST
def message_create(request):
    fields = {name: request.POST.get(name, "").strip() for name in ("name", "email", "text")}
    # A field people never see: only bots fill it in. They're told it worked.
    if request.POST.get("website"):
        return JsonResponse({}, status=201)

    if not fields["text"]:
        return error("no_text", "The message is empty")
    if len(fields["name"]) > 200 or len(fields["text"]) > MAX_TEXT:
        return error("too_long", f"Messages up to {MAX_TEXT} characters")
    if fields["email"]:
        try:
            validate_email(fields["email"])
        except ValidationError:
            return error("bad_email", "That isn't an email address")

    Message.objects.create(**fields)
    return JsonResponse({}, status=201)
