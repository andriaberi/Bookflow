import shutil
import tempfile

import pymupdf
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

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
        response = self.client.get("/api/convert/csrf")
        self.assertIn("csrftoken", response.cookies)
