from django.core.management.base import BaseCommand

from converter import cleanup


class Command(BaseCommand):
    help = "Delete the conversions whose page has been closed (requests do this too, now and then)."

    def handle(self, *args, **options):
        self.stdout.write(f"Deleted {cleanup.remove_left()} conversions.")
