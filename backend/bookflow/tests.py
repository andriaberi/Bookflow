import pdf2epub
from django.test import TestCase


class InfoTests(TestCase):
    def test_info_gives_the_installed_engine_version(self):
        response = self.client.get("/api/info")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"engine": pdf2epub.__version__})


class PageTests(TestCase):
    def test_every_page_address_gets_the_frontend_and_its_csrf_cookie(self):
        with self.settings(TEMPLATES=[{
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "OPTIONS": {"loaders": [("django.template.loaders.locmem.Loader", {"index.html": "<div id=root></div>"})]},
        }]):
            response = self.client.get("/library/some-book")

        self.assertContains(response, "<div id=root></div>")
        self.assertIn("csrftoken", response.cookies)

    def test_before_a_build_the_page_says_how_to_make_one(self):
        with self.settings(TEMPLATES=[{"BACKEND": "django.template.backends.django.DjangoTemplates", "DIRS": []}]):
            response = self.client.get("/")

        self.assertContains(response, "make frontend copy", status_code=503)

    def test_api_addresses_are_not_the_frontend(self):
        self.assertEqual(self.client.get("/api/nothing").status_code, 404)
