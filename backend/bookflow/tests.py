import pdf2epub
from django.test import TestCase


class InfoTests(TestCase):
    def test_info_gives_the_installed_engine_version(self):
        response = self.client.get("/api/info")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"engine": pdf2epub.__version__})
