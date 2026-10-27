import shutil
import tempfile
from pathlib import Path
from unittest import mock

import pymupdf
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from . import cleanup
from .models import Conversion

MEDIA = tempfile.mkdtemp(prefix="bookflow-test-media-")

PARAGRAPH = (
    "It was a quiet evening in the village, and the lamps were being lit one by one "
    "along the narrow street that led down to the river and the old stone bridge."
)


def make_pdf(chapters=2) -> bytes:
    """A small book: each chapter on its own page, a heading and a few paragraphs."""
    doc = pymupdf.open()
    for number in range(1, chapters + 1):
        page = doc.new_page()
        page.insert_text((72, 90), f"Chapter {number}", fontsize=20)
        y = 140
        for _ in range(4):
            box = pymupdf.Rect(72, y, page.rect.width - 72, y + 80)
            page.insert_textbox(box, PARAGRAPH, fontsize=11)
            y += 90
    data = doc.tobytes()
    doc.close()
    return data


def cover_image(name="cover.png"):
    pixmap = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 60, 90), False)
    pixmap.clear_with(200)
    return SimpleUploadedFile(name, pixmap.tobytes("png"), "image/png")


def upload(name="book.pdf", data=None):
    return SimpleUploadedFile(name, make_pdf() if data is None else data, "application/pdf")


@override_settings(MEDIA_ROOT=MEDIA, CONVERTER_BACKGROUND=False)
class ConversionTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def test_upload_reads_the_book(self):
        response = self.client.post("/api/convert/", {"pdf": upload("My Book.pdf")})

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["status"], "ready")
        self.assertEqual(data["name"], "My Book")
        self.assertEqual(data["pages"], 2)
        self.assertEqual(data["steps"], 3)
        self.assertGreater(data["book"]["paragraphs"], 0)

        conversion = Conversion.objects.get(pk=data["id"])
        self.assertEqual(conversion.book["version"], 1)
        self.assertIsNone(conversion.book["cover"])

    def test_detail_returns_the_conversion(self):
        created = self.client.post("/api/convert/", {"pdf": upload()}).json()

        response = self.client.get(f"/api/convert/{created['id']}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], created["id"])

    def test_unknown_conversion_is_404(self):
        response = self.client.get("/api/convert/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 404)

    def test_upload_needs_a_file(self):
        response = self.client.post("/api/convert/", {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "no_file")

    def test_a_file_named_pdf_must_be_a_pdf(self):
        response = self.client.post("/api/convert/", {"pdf": upload(data=b"just some text")})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "not_pdf")

    def test_a_broken_pdf_is_refused(self):
        response = self.client.post("/api/convert/", {"pdf": upload(data=b"%PDF-1.7 and then nothing")})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "unreadable")

    @override_settings(MAX_PDF_SIZE_MB=0)
    def test_a_pdf_over_the_limit_is_refused(self):
        response = self.client.post("/api/convert/", {"pdf": upload()})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "too_big")

    def test_upload_only_accepts_post(self):
        response = self.client.get("/api/convert/")
        self.assertEqual(response.status_code, 405)

    def test_csrf_endpoint_sets_the_cookie(self):
        response = self.client.get("/api/csrf")
        self.assertIn("csrftoken", response.cookies)


@override_settings(MEDIA_ROOT=MEDIA, CONVERTER_BACKGROUND=False)
class EditorTests(TestCase):
    def setUp(self):
        self.id = self.client.post("/api/convert/", {"pdf": upload("My Book.pdf")}).json()["id"]

    def get_book(self):
        return self.client.get(f"/api/convert/{self.id}/book").json()["book"]

    def put_book(self, book):
        return self.client.put(f"/api/convert/{self.id}/book", book, content_type="application/json")

    def test_the_editor_gets_the_book(self):
        response = self.client.get(f"/api/convert/{self.id}/book")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "My Book")
        self.assertEqual(data["pages"], 2)
        self.assertTrue(data["book"]["blocks"])

    def test_an_edit_is_saved(self):
        book = self.get_book()
        book["metadata"]["title"] = "A New Title"

        response = self.put_book(book)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["problems"], [])
        self.assertEqual(self.get_book()["metadata"]["title"], "A New Title")

    def test_a_book_that_cant_be_written_says_why(self):
        book = self.get_book()
        for block in book["blocks"]:
            block["include"] = False

        problems = self.put_book(book).json()["problems"]

        self.assertTrue(any("nothing to write" in problem for problem in problems))
        self.assertEqual(self.client.get(f"/api/convert/{self.id}/epub").status_code, 400)

    def test_data_that_isnt_a_book_is_refused(self):
        response = self.put_book({"version": 1, "blocks": "nope"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "bad_book")

        response = self.put_book([1, 2, 3])
        self.assertEqual(response.json()["error"], "bad_book")

    def test_the_epub_downloads_named_after_the_title(self):
        book = self.get_book()
        book["metadata"]["title"] = "Ünïcode Title"
        self.put_book(book)

        response = self.client.get(f"/api/convert/{self.id}/epub")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/epub+zip")
        self.assertIn("%C3%9Cn%C3%AFcode%20Title.epub", response["Content-Disposition"])
        self.assertEqual(response.content[:2], b"PK")

    def test_a_page_of_the_pdf_comes_as_an_image(self):
        response = self.client.get(f"/api/convert/{self.id}/pages/1.png?width=300")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(response.content[:4], b"\x89PNG")

    def test_a_page_outside_the_pdf_is_404(self):
        response = self.client.get(f"/api/convert/{self.id}/pages/9.png")
        self.assertEqual(response.status_code, 404)

    def test_an_unreasonable_page_width_is_refused(self):
        response = self.client.get(f"/api/convert/{self.id}/pages/1.png?width=99999")
        self.assertEqual(response.status_code, 400)

    def test_a_book_still_being_read_cant_be_edited(self):
        Conversion.objects.filter(pk=self.id).update(status="reading")
        response = self.client.get(f"/api/convert/{self.id}/book")
        self.assertEqual(response.status_code, 409)

    def test_the_cover_can_be_replaced_and_goes_into_the_epub(self):
        response = self.client.post(f"/api/convert/{self.id}/cover", {"cover": cover_image()})

        self.assertEqual(response.status_code, 200)
        self.assertIn("cover.jpg", response.json()["cover_url"])
        conversion = Conversion.objects.get(pk=self.id)
        self.assertEqual(conversion.book["cover_source"], "cover from the given image")
        epub = self.client.get(f"/api/convert/{self.id}/epub").content
        self.assertIn(b"images/cover.jpg", epub)

    def test_saving_the_book_keeps_the_new_cover(self):
        old = self.get_book()
        self.client.post(f"/api/convert/{self.id}/cover", {"cover": cover_image()})

        self.put_book(old)  # an autosave from before the cover changed

        self.assertEqual(Conversion.objects.get(pk=self.id).book["cover_source"], "cover from the given image")

    def test_the_cover_can_be_removed(self):
        response = self.client.delete(f"/api/convert/{self.id}/cover")

        self.assertEqual(response.json(), {"cover_url": None})
        conversion = Conversion.objects.get(pk=self.id)
        self.assertFalse(conversion.cover)
        self.assertEqual(conversion.book["cover_source"], "no cover")
        self.assertNotIn(b"images/cover.jpg", self.client.get(f"/api/convert/{self.id}/epub").content)

    def test_a_cover_must_be_an_image(self):
        response = self.client.post(f"/api/convert/{self.id}/cover", {"cover": SimpleUploadedFile("c.png", b"not an image")})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "not_image")

    def preview_url(self, block_id):
        return self.client.get(f"/api/convert/{self.id}/preview?block={block_id}").json()["url"]

    def test_each_block_previews_on_its_epub_page(self):
        blocks = self.get_book()["blocks"]
        headings = [block for block in blocks if block["type"] == "heading"]
        self.assertEqual(len(headings), 2)
        last_text = [block for block in blocks if block["type"] == "text"][-1]

        self.assertTrue(self.preview_url(headings[0]["id"]).endswith("/EPUB/text/section-0001.xhtml"))
        self.assertTrue(self.preview_url(last_text["id"]).endswith("/EPUB/text/section-0002.xhtml"))

    def test_a_left_out_block_previews_where_it_would_be(self):
        book = self.get_book()
        second = [index for index, block in enumerate(book["blocks"]) if block["type"] == "heading"][1]
        book["blocks"][second + 1]["include"] = False
        self.put_book(book)

        url = self.preview_url(book["blocks"][second + 1]["id"])

        self.assertTrue(url.endswith("section-0002.xhtml"))

    def test_the_preview_page_and_its_stylesheet_are_served(self):
        url = self.preview_url(self.get_book()["blocks"][0]["id"])

        page = self.client.get(url)
        style = self.client.get(url.replace("text/section-0001.xhtml", "style.css"))

        self.assertEqual(page.status_code, 200)
        self.assertEqual(page["Content-Type"], "application/xhtml+xml")
        self.assertIn(b"Chapter 1", page.content)
        self.assertEqual(page["X-Frame-Options"], "SAMEORIGIN")
        self.assertEqual(style["Content-Type"], "text/css")

    def test_the_preview_follows_the_edits(self):
        book = self.get_book()
        heading = next(block for block in book["blocks"] if block["type"] == "heading")
        url = self.preview_url(heading["id"])
        self.client.get(url)
        heading["label"] = "Renamed Chapter"
        self.put_book(book)

        self.assertIn("Renamed Chapter".encode(), self.client.get(url).content)

    def test_only_files_inside_the_epub_are_served(self):
        response = self.client.get(f"/api/convert/{self.id}/epub-files/../../settings.py")
        self.assertEqual(response.status_code, 404)
        response = self.client.get(f"/api/convert/{self.id}/epub-files/EPUB/nothing.xhtml")
        self.assertEqual(response.status_code, 404)


@override_settings(MEDIA_ROOT=MEDIA, CONVERTER_BACKGROUND=False)
class CleanupTests(TestCase):
    def setUp(self):
        self.id = self.client.post("/api/convert/", {"pdf": upload()}).json()["id"]
        self.folder = Path(Conversion.objects.get(pk=self.id).pdf.path).parent

    def later(self, delta):
        """Run the cleanup as if `delta` had passed."""
        with mock.patch("converter.cleanup.timezone.now", return_value=timezone.now() + delta):
            return cleanup.remove_left()

    def exists(self):
        return Conversion.objects.filter(pk=self.id).exists()

    def test_a_left_conversion_goes_after_the_grace(self):
        self.assertEqual(self.client.post(f"/api/convert/{self.id}/left").status_code, 204)

        self.assertEqual(self.later(cleanup.GRACE / 2), 0)
        self.assertEqual(self.later(cleanup.GRACE * 2), 1)
        self.assertFalse(self.exists())
        self.assertFalse(self.folder.exists())

    def test_a_reload_keeps_it(self):
        self.client.post(f"/api/convert/{self.id}/left")
        self.client.post(f"/api/convert/{self.id}/seen")

        self.later(cleanup.GRACE * 2)

        self.assertTrue(self.exists())

    def test_an_open_page_keeps_it_and_a_silent_one_doesnt(self):
        self.assertEqual(self.later(cleanup.EXPIRY / 2), 0)
        self.later(cleanup.EXPIRY * 2)
        self.assertFalse(self.exists())

    def test_the_admins_conversions_are_kept(self):
        self.client.force_login(User.objects.create_superuser("admin", "admin@example.com", "pw"))
        kept = self.client.post("/api/convert/", {"pdf": upload()}).json()["id"]

        self.later(cleanup.EXPIRY * 2)

        self.assertTrue(Conversion.objects.filter(pk=kept).exists())
        self.assertFalse(self.exists())

    def test_a_book_being_read_is_left_alone_unless_stuck(self):
        Conversion.objects.filter(pk=self.id).update(status="reading")
        self.later(cleanup.EXPIRY * 2)
        self.assertTrue(self.exists())
        self.later(cleanup.STUCK * 2)
        self.assertFalse(self.exists())

    def test_a_gone_conversion_is_404(self):
        self.later(cleanup.EXPIRY * 2)
        self.assertEqual(self.client.post(f"/api/convert/{self.id}/seen").status_code, 404)
        self.assertEqual(self.client.get(f"/api/convert/{self.id}").status_code, 404)
