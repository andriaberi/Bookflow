import shutil
import tempfile

from converter.models import Conversion
from converter.tests import make_pdf
from django.contrib.auth.models import User
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from .models import Suggestion

MEDIA = tempfile.mkdtemp(prefix="bookflow-test-media-")


def pdf_upload(data=None):
    return SimpleUploadedFile("book.pdf", make_pdf() if data is None else data, "application/pdf")


@override_settings(MEDIA_ROOT=MEDIA, CONVERTER_BACKGROUND=False, MAIL_BACKGROUND=False, NOTIFY_EMAIL="owner@example.com", SITE_URL="https://bookflow.test")
class SuggestionTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def suggest(self, **fields):
        return self.client.post("/api/contact/", {"kind": "book", **fields})

    def test_a_book_can_be_suggested_by_name(self):
        response = self.suggest(title=" Animal Farm ", author="George Orwell", note="A classic.", email="reader@example.com")

        self.assertEqual(response.status_code, 201)
        suggestion = Suggestion.objects.get()
        self.assertEqual((suggestion.title, suggestion.author, suggestion.status), ("Animal Farm", "George Orwell", "new"))
        self.assertFalse(suggestion.pdf)

    def test_a_pdf_comes_with_its_rights(self):
        response = self.suggest(title="My Book", pdf=pdf_upload(), rights="public_domain")

        self.assertEqual(response.status_code, 201)
        suggestion = Suggestion.objects.get()
        self.assertEqual(suggestion.rights, "public_domain")
        with suggestion.pdf.open("rb") as f:
            self.assertTrue(f.read().startswith(b"%PDF-"))

    def test_rights_are_asked_only_with_a_pdf(self):
        self.assertEqual(self.suggest(title="My Book", pdf=pdf_upload()).json()["error"], "no_rights")
        self.suggest(title="No PDF", rights="permission")
        self.assertEqual(Suggestion.objects.get().rights, "")

    def test_permission_says_who_holds_the_rights(self):
        response = self.suggest(title="My Book", pdf=pdf_upload(), rights="permission")
        self.assertEqual(response.json()["error"], "no_holder")

        self.suggest(title="My Book", pdf=pdf_upload(), rights="permission", holder="The translator")
        self.assertEqual(Suggestion.objects.get().holder, "The translator")

    def test_only_permission_keeps_a_holder(self):
        self.suggest(title="Old Book", pdf=pdf_upload(), rights="public_domain", holder="Someone")
        self.assertEqual(Suggestion.objects.get().holder, "")

    def test_the_owner_hears_of_each_suggestion(self):
        self.suggest(title="My Book", author="Me", pdf=pdf_upload(), rights="permission", holder="The translator", email="r@example.com")

        [email] = mail.outbox
        self.assertEqual((email.to, email.reply_to), (["owner@example.com"], ["r@example.com"]))
        self.assertIn("My Book", email.subject)
        self.assertIn("Has the rights or permission (The translator)", email.body)
        self.assertIn(f"/admin/library/suggestion/{Suggestion.objects.get().pk}/change/", email.body)

    def test_the_suggester_is_told_in_their_language(self):
        self.suggest(title="ომი და მშვიდობა", email="r@example.com", lang="ka")
        self.suggest(title="No Address")
        self.client.force_login(User.objects.create_superuser("admin", "admin@example.com", "pw"))
        mail.outbox.clear()

        ids = list(Suggestion.objects.values_list("pk", flat=True))
        self.client.post("/admin/library/suggestion/", {"action": "tell_added", "_selected_action": ids})

        [email] = mail.outbox
        self.assertEqual(email.to, ["r@example.com"])
        self.assertIn("ბიბლიოთეკაშია", email.subject)
        self.assertIn("https://bookflow.test/library", email.body)
        self.assertEqual(set(Suggestion.objects.values_list("status", flat=True)), {"accepted"})

    def test_an_unknown_language_is_english(self):
        self.suggest(title="A", lang="fr")
        self.assertEqual(Suggestion.objects.get().lang, "en")

    def test_bad_suggestions_are_refused(self):
        self.assertEqual(self.suggest(title="  ").json()["error"], "no_title")
        self.assertEqual(self.suggest(title="A", note="x" * 2001).json()["error"], "too_long")
        self.assertEqual(self.suggest(title="A", email="not an address").json()["error"], "bad_email")
        self.assertEqual(self.suggest(title="A", pdf=pdf_upload(b"plain text"), rights="unsure").json()["error"], "not_pdf")
        self.assertFalse(Suggestion.objects.exists())

    @override_settings(MAX_PDF_SIZE_MB=0)
    def test_a_pdf_over_the_limit_is_refused(self):
        self.assertEqual(self.suggest(title="A", pdf=pdf_upload(), rights="unsure").json()["error"], "too_big")

    def test_bots_are_told_it_worked_but_nothing_is_kept(self):
        response = self.suggest(title="Cheap pills", website="http://spam.example")

        self.assertEqual(response.status_code, 201)
        self.assertFalse(Suggestion.objects.exists())

    def test_a_suggested_pdf_can_be_read_in_the_converter(self):
        self.suggest(title="My Book", pdf=pdf_upload(), rights="permission", holder="Me")
        self.client.force_login(User.objects.create_superuser("admin", "admin@example.com", "pw"))

        response = self.client.post("/admin/library/suggestion/", {"action": "convert", "_selected_action": [Suggestion.objects.get().pk]}, follow=True)

        conversion = Conversion.objects.get()
        self.assertEqual((conversion.name, conversion.pages, conversion.status), ("My Book", 2, "ready"))
        self.assertContains(response, f"/convert/{conversion.pk}")
