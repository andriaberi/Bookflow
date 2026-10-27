import json
import shutil
import tempfile

from converter.models import Conversion
from converter.tests import cover_image, upload
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from pdf2epub import Book as EngineBook

from .forms import BookForm
from .models import Book

MEDIA = tempfile.mkdtemp(prefix="bookflow-test-media-")


def json_file(data, name="book.json"):
    return SimpleUploadedFile(name, json.dumps(data).encode(), "application/json")


@override_settings(MEDIA_ROOT=MEDIA, CONVERTER_BACKGROUND=False)
class LibraryTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.id = self.client.post("/api/convert/", {"pdf": upload("My Book.pdf")}).json()["id"]
        self.data = Conversion.objects.get(pk=self.id).book

    def form(self, fields=None, files=None, instance=None):
        return BookForm({"order": 0, "is_published": True, **(fields or {})}, files or {}, instance=instance)

    def test_book_data_writes_the_epub_and_fills_the_details(self):
        form = self.form(files={"data_file": json_file(self.data)})

        self.assertTrue(form.is_valid(), form.errors)
        book = form.save()

        metadata = self.data["metadata"]
        self.assertEqual((book.title, book.language), (metadata["title"], metadata["language"]))
        self.assertTrue(book.slug)
        self.assertEqual(book.data["blocks"], self.data["blocks"])
        with book.epub.open("rb") as f:
            self.assertEqual(f.read(2), b"PK")

    def test_details_typed_in_are_kept(self):
        form = self.form({"title": "Another Title"}, {"data_file": json_file(self.data)})
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.save().title, "Another Title")

    def test_a_cover_inside_the_data_becomes_the_cover(self):
        book = EngineBook.from_dict(self.data)
        book.set_cover(cover_image().read())

        form = self.form(files={"data_file": json_file(book.to_dict())})

        self.assertTrue(form.is_valid(), form.errors)
        saved = form.save()
        self.assertTrue(saved.cover)
        self.assertIsNone(saved.data["cover"])
        with saved.epub.open("rb") as f:
            self.assertIn(b"images/cover.jpg", f.read())

    def test_data_that_isnt_a_book_is_refused(self):
        form = self.form(files={"data_file": json_file({"version": 1})})
        self.assertFalse(form.is_valid())
        self.assertIn("data_file", form.errors)

        form = self.form(files={"data_file": SimpleUploadedFile("book.json", b"not json")})
        self.assertIn("data_file", form.errors)

    def test_a_book_that_cant_be_written_is_refused(self):
        for block in self.data["blocks"]:
            block["include"] = False
        form = self.form(files={"data_file": json_file(self.data)})
        self.assertFalse(form.is_valid())
        self.assertIn("nothing to write", str(form.errors))

    def test_a_book_needs_an_epub_or_its_data(self):
        form = self.form({"title": "Empty"})
        self.assertFalse(form.is_valid())
        self.assertIn("epub", form.errors)

    def test_an_uploaded_epub_is_enough(self):
        epub = SimpleUploadedFile("book.epub", b"PK epub", "application/epub+zip")
        form = self.form({"title": "Plain"}, {"epub": epub})
        self.assertTrue(form.is_valid(), form.errors)
        self.assertIsNone(form.save().data)

    def test_books_with_the_same_title_get_numbered_slugs(self):
        first = Book.objects.create(title="Same", epub="a.epub")
        second = Book.objects.create(title="Same", epub="b.epub")
        self.assertEqual((first.slug, second.slug), ("same", "same-2"))

    def test_a_conversion_can_be_added_to_the_library(self):
        Conversion.objects.filter(pk=self.id).update(book={**self.data, "metadata": {**self.data["metadata"], "title": "Edited"}})
        self.client.post(f"/api/convert/{self.id}/cover", {"cover": cover_image()})
        admin = User.objects.create_superuser("admin", "admin@example.com", "pw")
        self.client.force_login(admin)

        self.client.post("/admin/converter/conversion/", {"action": "add_to_library", "_selected_action": [self.id]})

        book = Book.objects.get()
        self.assertEqual(book.title, "Edited")
        self.assertFalse(book.is_published)
        self.assertTrue(book.cover)
        with book.epub.open("rb") as f:
            epub = f.read()
        self.assertIn(b"images/cover.jpg", epub)
        self.assertEqual(book.data["metadata"]["title"], "Edited")

    def test_the_api_lists_only_published_books(self):
        Book.objects.create(title="Shown", epub="a.epub")
        Book.objects.create(title="Hidden", epub="b.epub", is_published=False)

        titles = [book["title"] for book in self.client.get("/api/library/").json()]

        self.assertEqual(titles, ["Shown"])

    def test_the_admin_pages_open(self):
        form = self.form(files={"data_file": json_file(self.data)})
        self.assertTrue(form.is_valid(), form.errors)
        book = form.save()
        self.client.force_login(User.objects.create_superuser("admin", "admin@example.com", "pw"))

        self.assertEqual(self.client.get("/admin/library/book/add/").status_code, 200)
        page = self.client.get(f"/admin/library/book/{book.pk}/change/")

        self.assertEqual(page.status_code, 200)
        self.assertContains(page, "2 headings")
