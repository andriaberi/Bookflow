from django.core.management.base import BaseCommand

from contact.review import remind


class Command(BaseCommand):
    help = "Email the owner what is waiting for review in the admin, if anything is."

    def handle(self, *args, **options):
        self.stdout.write(f"{remind()} waiting for review")
