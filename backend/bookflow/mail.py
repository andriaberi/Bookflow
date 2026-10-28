"""Sending email without keeping anyone waiting: a failure is logged, never raised."""

import logging
import threading

from django.conf import settings
from django.core.mail import EmailMessage

log = logging.getLogger(__name__)


def send(subject: str, body: str, to: str, reply_to: str = "", wait: bool = False) -> None:
    """Email `to`, in the background unless settings say otherwise (tests), or `wait`:
    a command exits right after, and would take a background send with it."""
    if not to:
        return
    message = EmailMessage(subject, body, to=[to], reply_to=[reply_to] if reply_to else None)
    if settings.MAIL_BACKGROUND and not wait:
        threading.Thread(target=_deliver, args=(message,), daemon=True).start()
    else:
        _deliver(message)


def notify(subject: str, body: str, reply_to: str = "", wait: bool = False) -> None:
    """Email the site's owner (NOTIFY_EMAIL)."""
    send(f"[Bookflow] {subject}", body, settings.NOTIFY_EMAIL, reply_to, wait)


def admin_url(obj) -> str:
    """The address of `obj`'s page in the admin."""
    meta = obj._meta
    return f"{settings.SITE_URL}/admin/{meta.app_label}/{meta.model_name}/{obj.pk}/change/"


def _deliver(message: EmailMessage) -> None:
    try:
        message.send()
    except Exception:
        log.exception("couldn't send %r to %s", message.subject, message.to)
