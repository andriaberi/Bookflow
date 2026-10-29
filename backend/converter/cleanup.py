"""Conversions are deleted once their page is closed: nobody's PDF stays on the server.

While a conversion's page is open it says so every 30 seconds (frontend presence.js);
leaving says so too
(left()), and the conversion goes a GRACE later, unless the page comes straight back,
as a reload does. A page that closes without a word (a crash, a killed tab) is
gone EXPIRY after it was last seen.
"""

import shutil
import time
from datetime import timedelta
from pathlib import Path

from django.db.models import Q
from django.utils import timezone

from .models import Conversion

GRACE = timedelta(minutes=1)
EXPIRY = timedelta(minutes=15)
# A book still being read is left alone, unless reading never finished.
STUCK = timedelta(hours=1)
# How often a request may look for conversions to delete, in seconds
EVERY = 60

_last_run = 0.0


def seen(conversion: Conversion) -> None:
    Conversion.objects.filter(pk=conversion.pk).update(last_seen=timezone.now())


def left(conversion: Conversion) -> None:
    """Delete the conversion a GRACE from now, unless its page is seen again first."""
    Conversion.objects.filter(pk=conversion.pk).update(last_seen=timezone.now() - EXPIRY + GRACE)


def remove_left() -> int:
    """Delete the conversions nobody has open; how many."""
    now = timezone.now()
    gone = Conversion.objects.filter(keep=False, last_seen__lt=now - EXPIRY).filter(
        ~Q(status="reading") | Q(created_at__lt=now - STUCK)
    )
    count = 0
    for conversion in gone:
        if conversion.pdf:
            shutil.rmtree(Path(conversion.pdf.path).parent, ignore_errors=True)
        conversion.delete()
        count += 1
    return count


def now_and_then() -> None:
    """remove_left(), at most once every EVERY seconds: requests call this as they come."""
    global _last_run
    if time.monotonic() - _last_run >= EVERY:
        _last_run = time.monotonic()
        remove_left()
