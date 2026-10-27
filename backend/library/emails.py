"""The email a suggester gets when their book is in the library, in their language."""

from bookflow import mail
from django.conf import settings

ADDED = {
    "en": (
        "{title} is in the Bookflow library",
        "Hello,\n\nThe book you suggested, {title}, is now in the Bookflow library, free to "
        "download as EPUB:\n\n{url}\n\nThank you for suggesting it.\n\nBookflow",
    ),
    "ka": (
        "{title} Bookflow-ის ბიბლიოთეკაშია",
        "გამარჯობა,\n\nწიგნი, რომელიც შემოგვთავაზე, „{title}“, ახლა Bookflow-ის ბიბლიოთეკაშია "
        "და EPUB-ად უფასოდ ჩამოიტვირთება:\n\n{url}\n\nგმადლობ შემოთავაზებისთვის.\n\nBookflow",
    ),
}


def tell_added(suggestion) -> None:
    subject, body = ADDED.get(suggestion.lang, ADDED["en"])
    values = {"title": suggestion.title, "url": f"{settings.SITE_URL}/library"}
    mail.send(subject.format(**values), body.format(**values), suggestion.email)
