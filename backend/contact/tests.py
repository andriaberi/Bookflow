from io import StringIO
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from library.models import Suggestion

from . import review
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

    @override_settings(POSTS_PER_HOUR={"message": 2})
    def test_one_visitor_may_post_only_so_often(self):
        cache.clear()
        self.assertEqual([self.send(text="Hi").status_code for _ in range(3)], [201, 201, 429])
        self.assertEqual(self.client.post("/api/contact/", {"text": "Hi"}, HTTP_X_REAL_IP="10.0.0.3").status_code, 201)

    def test_only_post(self):
        self.assertEqual(self.client.get("/api/contact/").status_code, 405)

    def test_a_problem_is_kept_with_the_page_it_is_about(self):
        self.send(kind="problem", link="/library/some-book", text="Chapter 3 is missing.")

        message = Message.objects.get()
        self.assertEqual((message.kind, message.link), ("problem", "/library/some-book"))
        [email] = mail.outbox
        self.assertIn("Problem reported", email.subject)
        self.assertIn("About: /library/some-book", email.body)

    def test_a_copyright_concern_needs_the_book_and_an_address(self):
        self.assertEqual(self.send(kind="copyright", email="a@example.com", text="Mine").json()["error"], "no_link")
        self.assertEqual(self.send(kind="copyright", link="Animal Farm", text="Mine").json()["error"], "no_email")
        self.send(kind="copyright", link="Animal Farm", email="a@example.com", text="Mine")

        self.assertEqual(Message.objects.get().kind, "copyright")
        self.assertIn("Copyright concern", mail.outbox[0].subject)

    def test_a_plain_message_keeps_no_link(self):
        self.send(link="/somewhere", text="Hello")
        self.assertEqual(Message.objects.get().link, "")

    def test_unknown_kinds_are_refused(self):
        self.assertEqual(self.send(kind="spam", text="Hi").json()["error"], "bad_kind")
        self.assertFalse(Message.objects.exists())


@override_settings(MAIL_BACKGROUND=True, NOTIFY_EMAIL="owner@example.com", SITE_URL="https://bookflow.test")
class ReviewTests(TestCase):
    def test_nothing_waiting_sends_nothing(self):
        self.assertEqual(review.remind(), 0)
        self.assertEqual(mail.outbox, [])

    def test_the_owner_hears_what_is_waiting(self):
        Message.objects.create(text="Hello")
        Message.objects.create(text="Read already", is_read=True)
        Suggestion.objects.create(title="Animal Farm")
        Suggestion.objects.create(title="Done", status="accepted")

        # Sent before the command exits, though mail otherwise goes in the background.
        call_command("remind_review", stdout=StringIO())

        [email] = mail.outbox
        self.assertEqual((email.to, email.subject), (["owner@example.com"], "[Bookflow] 2 waiting for review"))
        self.assertIn("1 unread messages:\nhttps://bookflow.test/admin/contact/message/?is_read__exact=0", email.body)
        self.assertIn("1 new book suggestions:\nhttps://bookflow.test/admin/library/suggestion/?status__exact=new", email.body)
        self.assertNotIn("unpublished", email.body)
