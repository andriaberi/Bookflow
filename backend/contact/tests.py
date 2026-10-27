from unittest import mock

from django.core import mail
from django.test import TestCase, override_settings

from .models import Message


@override_settings(MAIL_BACKGROUND=False, NOTIFY_EMAIL="owner@example.com", SITE_URL="https://bookflow.test")
class ContactTests(TestCase):
    def send(self, **fields):
        return self.client.post("/api/contact/", fields)

    def test_a_message_is_kept_for_the_admin(self):
        response = self.send(name=" Nino ", email="nino@example.com", text="Love the library.")

        self.assertEqual(response.status_code, 201)
        message = Message.objects.get()
        self.assertEqual((message.name, message.email, message.text, message.is_read), ("Nino", "nino@example.com", "Love the library.", False))

    def test_name_and_email_are_optional(self):
        self.assertEqual(self.send(text="Hello").status_code, 201)

    def test_bad_messages_are_refused(self):
        self.assertEqual(self.send(text="  ").json()["error"], "no_text")
        self.assertEqual(self.send(text="x" * 5001).json()["error"], "too_long")
        self.assertEqual(self.send(text="Hi", email="nope").json()["error"], "bad_email")
        self.assertFalse(Message.objects.exists())

    def test_bots_are_told_it_worked_but_nothing_is_kept(self):
        self.assertEqual(self.send(text="Cheap pills", website="http://spam.example").status_code, 201)
        self.assertFalse(Message.objects.exists())

    def test_the_owner_is_emailed_and_can_reply(self):
        self.send(name="Nino", email="nino@example.com", text="Love the library.")

        [email] = mail.outbox
        self.assertEqual(email.to, ["owner@example.com"])
        self.assertEqual(email.reply_to, ["nino@example.com"])
        self.assertIn("Nino", email.subject)
        self.assertIn("Love the library.", email.body)
        self.assertIn(f"https://bookflow.test/admin/contact/message/{Message.objects.get().pk}/change/", email.body)

    def test_a_mail_server_that_fails_doesnt_lose_the_message(self):
        with mock.patch("django.core.mail.EmailMessage.send", side_effect=OSError("no server")), self.assertLogs("bookflow.mail"):
            response = self.send(text="Hello")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Message.objects.exists())

    @override_settings(NOTIFY_EMAIL="")
    def test_no_owner_address_sends_nothing(self):
        self.send(text="Hello")
        self.assertEqual(mail.outbox, [])

    def test_only_post(self):
        self.assertEqual(self.client.get("/api/contact/").status_code, 405)
