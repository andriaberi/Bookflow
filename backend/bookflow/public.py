"""What the forms the public posts to share: their fields, a trap for bots, an email
check, and a limit on how often one visitor may post."""

import time
from functools import wraps

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse

from .responses import error

# A field people never see; only bots fill it in.
TRAP = "website"


def fields(request, *names: str) -> dict:
    return {name: request.POST.get(name, "").strip() for name in names}


def too_long(fields: dict, model, **limits: int) -> bool:
    """Whether a field is longer than its model field may be, or than `limits` says for
    a field with no length of its own."""
    for name, value in fields.items():
        most = limits.get(name) or getattr(model._meta.get_field(name), "max_length", None)
        if most and len(value) > most:
            return True
    return False


def is_email(text: str) -> bool:
    try:
        validate_email(text)
    except ValidationError:
        return False
    return True


def created() -> JsonResponse:
    return JsonResponse({}, status=201)


def visitor(request) -> str:
    """Who posted: behind nginx, the address it passes on as X-Real-IP."""
    return request.META.get("HTTP_X_REAL_IP") or request.META.get("REMOTE_ADDR", "")


def limited(name: str, trap: bool = True):
    """At most settings.POSTS_PER_HOUR[name] posts an hour from one visitor, then 429.
    With `trap`, a post that fills in the trap field is told it worked, and dropped."""
    def decorate(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if trap and request.POST.get(TRAP):
                return created()
            per_hour = settings.POSTS_PER_HOUR.get(name)
            if per_hour:
                key = f"posts:{name}:{visitor(request)}:{int(time.time() // 3600)}"
                cache.add(key, 0, 3600)
                if cache.incr(key) > per_hour:
                    return error("too_many", "Too many in an hour; try again later", status=429)
            return view(request, *args, **kwargs)
        return wrapper
    return decorate
