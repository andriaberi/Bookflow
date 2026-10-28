"""What is waiting in the admin for the owner to look at, sent as one email."""

from bookflow import mail
from django.conf import settings
from library.models import Book, Suggestion

from .models import Message


def waiting() -> list[tuple[str, int, str]]:
    """Each kind of thing waiting: what it is, how many, and the admin page listing them."""
    admin = f"{settings.SITE_URL}/admin"
    found = [
        ("unread messages", Message.objects.filter(is_read=False).count(), f"{admin}/contact/message/?is_read__exact=0"),
        ("new book suggestions", Suggestion.objects.filter(status="new").count(), f"{admin}/library/suggestion/?status__exact=new"),
        ("unpublished books to check", Book.objects.filter(is_published=False).count(), f"{admin}/library/book/?is_published__exact=0"),
    ]
    return [item for item in found if item[1]]


def remind() -> int:
    """Email the owner what's waiting, if anything is; how many things are."""
    items = waiting()
    total = sum(count for _, count, _ in items)
    if total:
        lines = [f"{count} {what}:\n{url}" for what, count, url in items]
        mail.notify(f"{total} waiting for review", "\n\n".join(lines), wait=True)
    return total
