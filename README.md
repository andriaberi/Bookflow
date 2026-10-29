# Bookflow

Bookflow turns PDF books into EPUBs that read like real books, and keeps a library of
books already converted and checked by hand. It's a Django + React site on
[PDF2EPUB](https://github.com/andriaberi/PDF2EPUB), the engine that finds a book's
chapters, paragraphs, notes and cover. The whole site is in English and Georgian, in
light and dark.

- **Converter**: upload a PDF, watch it being read, then fix the book in the editor,
  side by side with the PDF page and the EPUB page, and download the EPUB. Uploads and
  edits are deleted as soon as the person leaves.
- **Library**: ready-made EPUBs to search, sort and download, each with its own page.
- **Contact**: one form, with a dropdown for what it's about: a message, a problem, a book
  to suggest (with its PDF if there is one) or a copyright concern. Each shows its own
  fields, lands in the admin and emails the owner.

## Running it locally

Python 3.12+ and Node 22.

```sh
make install       # .venv, backend and frontend packages, backend/.env from .env.example
make migrate
make superuser     # an admin account
make dev           # Django on :8000 and React on :3000; open http://localhost:3000
```

`make check` runs Django's checks and the backend tests; `npm test` and `npm run lint` in
`frontend/` run the frontend's. `make help` lists everything else.

## Configuration

`backend/.env` (see `backend/.env.example`):

| Setting | What it is |
| --- | --- |
| `SECRET_KEY` | Django's secret key; required |
| `DEBUG` | `True` only in development |
| `ALLOWED_HOSTS` | The site's domain(s), comma-separated |
| `SITE_URL` | The site's address, such as `https://bookflow.example`: links in emails, and where forms are posted from |
| `MAX_PDF_SIZE_MB` | The largest PDF accepted (100) |
| `MAX_PDF_PAGES` | The most pages a PDF accepted may have (2000) |
| `CONVERTER_READERS` | How many books are read at once; more wait their turn (2) |
| `PDF2EPUB_SOURCE` | Where `make install-engine` installs the engine from: a release tag, or a local folder while developing it |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | The Gmail account that sends email, and an [app password](https://myaccount.google.com/apppasswords) for it. Without a password, emails are printed to the console |
| `NOTIFY_EMAIL` | Who hears about new suggestions and messages, and gets the daily email of what's waiting for review (the account above if left out) |
| `SOURCE_COMMIT` | The commit the footer's "Source code" link points to. Read from the checkout when the server starts if left out; set it where there is no `.git` |

## Deploying

On a Linux server with nginx, from a checkout at `/srv/bookflow` run by a `bookflow` user
(the files in `deploy/` assume both; change them to suit):

1. `backend/.env` with `DEBUG=False`, the real `SECRET_KEY`, `ALLOWED_HOSTS` and
   `SITE_URL`, and the email settings.
2. `deploy/gunicorn.service` to `/etc/systemd/system/`, and `deploy/nginx.conf` to
   `/etc/nginx/sites-available/bookflow` (linked into `sites-enabled`), with the domain
   filled in. Then `certbot --nginx` for HTTPS.
3. `make deploy`: installs everything, builds the frontend, collects static files,
   migrates and restarts gunicorn and nginx. Run it again after each `git pull`.
4. `make superuser`, once.
5. `deploy/bookflow-cleanup.service` and `.timer` to `/etc/systemd/system/`, then
   `systemctl enable --now bookflow-cleanup.timer`, so conversions left open are deleted
   even when nobody visits.
6. `deploy/bookflow-review.service` and `.timer` the same way, then
   `systemctl enable --now bookflow-review.timer`: every morning at 9, if anything is
   waiting in the admin, `NOTIFY_EMAIL` gets one email listing it, with links.

nginx serves `/media/` (covers and library EPUBs) itself and passes the rest to gunicorn,
with the visitor's address in `X-Real-IP`: Django uses it to limit how often one visitor
may upload or post a form. Run `sudo nginx -t` after changing `deploy/nginx.conf`.

### Security

- **Visitors' files** (PDFs and cover images) are only opened in a process of their own
  (`backend/converter/isolated.py`), with limits on its memory and time
  (`CONVERTER_LIMITS` in `settings.py`). A PDF built to unpack into gigabytes, never
  finish, or crash MuPDF fails with a message instead of taking the site down. Only
  `CONVERTER_READERS` books are read at once, across all the workers.
- **How often**: nginx limits requests per address (uploads and admin logins most), the
  connections each may hold, and slow requests; Django limits how many forms one visitor
  posts an hour, counted in `backend/cache/` so every worker sees the same count.
- **Pages** carry a Content-Security-Policy: only the site's own scripts run. The
  converter's PDFs and preview EPUBs are never served from `/media/`, and what is
  served there can't run anything.
- **The service** (`deploy/gunicorn.service`) can write only to `backend/`, can't gain
  privileges, and is held to `MemoryMax`. Keep that under the server's memory, and
  `CONVERTER_LIMITS` × `CONVERTER_READERS` under that.
- `make check` runs `manage.py check`; on the server, `manage.py check --deploy` checks
  the production settings too.

## Running the site

Everything is in the admin, at `/admin/`:

- **Library → Books**: add a book from its pdf2epub data (`.json`, so the EPUB can be
  written again later) or from a finished EPUB. Title, author, language and cover come
  from the data when left blank.
- **Converter → Conversions**: "Add to the library" copies a converted, edited book into
  the library, unpublished until you check it. Conversions made while signed in as admin
  are kept; everyone else's go when they leave.
- **Library → Suggestions**: suggested books, with their PDFs. "Read the PDF in the
  converter" starts on one; "Tell them it's in the library" emails whoever suggested it,
  in their language.
- **Contact → Messages**: messages, problems and copyright concerns, filtered by kind.
  The email you get for each one replies to the sender. Tick "Is read" once handled.

Besides the email for each new message or suggestion, `make review` (run daily by the
timer) emails a list of what is still waiting: unread messages, new suggestions and
unpublished books.

## Contributing

Contributions are welcome under the [Developer Certificate of Origin](https://developercertificate.org/):
sign off each commit (`git commit -s`) to certify you wrote it, or otherwise have the right
to submit it under this project's license. See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
and the [code of conduct](docs/CODE_OF_CONDUCT.md). Security problems go privately, as
[docs/SECURITY.md](docs/SECURITY.md) says.

## License

[GNU AGPL-3.0](LICENSE) or later, © 2026 Andria Beridze, with one added term (see
[NOTICE](NOTICE)): anything built on Bookflow, including a website, must show its users
this credit:

> Based on Bookflow by Andria Beridze (https://github.com/andriaberi/Bookflow)

Under the AGPL, anyone who runs Bookflow, or a changed copy of it, as a site for others
must offer those visitors its source under the same license. The footer does this here:
its "Source code" link goes to the exact commit the server runs. PDF2EPUB, the engine, is
AGPL too, with its own credit, which the footer also shows.
