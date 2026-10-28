import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
FRONTEND_DIR = BASE_DIR.parent / "frontend"

SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False") == "True"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set")

TESTING = sys.argv[1:2] == ["test"]

# The site's address, for links in emails and the origin forms are posted from
SITE_URL = os.getenv("SITE_URL", "http://localhost:8000").rstrip("/")
CSRF_TRUSTED_ORIGINS = [SITE_URL]

if not DEBUG:
    # Served over HTTPS behind nginx, which says so in X-Forwarded-Proto.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_REFERRER_POLICY = "same-origin"

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "converter",
    "library",
    "contact",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "bookflow.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "bookflow" / "templates"],  # React index.html here
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "bookflow.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files: React's build (make frontend), once there is one
BUILD_DIR = FRONTEND_DIR / "build"
STATIC_URL = "/static/"
STATICFILES_DIRS = [BUILD_DIR / "static"] if BUILD_DIR.exists() else []
STATIC_ROOT = BASE_DIR / "staticfiles"
# The files the build puts at the site's root: the tab icons and the app manifest
WHITENOISE_ROOT = BUILD_DIR if BUILD_DIR.exists() else None

# Uploaded PDFs, converted EPUBs and library covers
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# The commit the server runs, for the footer's link to its source: read from the checkout
# when the server starts, which every deploy does again. SOURCE_COMMIT overrides it where
# there is no checkout.
def running_commit():
    if commit := os.getenv("SOURCE_COMMIT"):
        return commit
    try:
        git = ["git", "-C", BASE_DIR.parent, "rev-parse", "HEAD"]
        return subprocess.run(git, capture_output=True, text=True, check=True, timeout=5).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


SOURCE_COMMIT = running_commit()

# Largest PDF the converter accepts, in megabytes
MAX_PDF_SIZE_MB = int(os.getenv("MAX_PDF_SIZE_MB", "100"))

# Read uploaded books in a background thread; tests turn this off to read right away.
CONVERTER_BACKGROUND = True

# Email, sent through Gmail (or any SMTP server) with the account's app password.
# Without a password, emails are printed to the console instead of sent.
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_TIMEOUT = 15
if not EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = f"Bookflow <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "Bookflow <bookflow@localhost>"
# Who hears about new suggestions and messages
NOTIFY_EMAIL = os.getenv("NOTIFY_EMAIL", EMAIL_HOST_USER)
# Send emails in a background thread, so a form never waits on the mail server; tests
# turn this off.
MAIL_BACKGROUND = True

# How often one visitor may post each form, per hour (bookflow/public.py); tests
# post freely.
POSTS_PER_HOUR = {} if TESTING else {"upload": 30, "suggestion": 10, "message": 10}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "converter": {"handlers": ["console"], "level": "INFO"},
        "bookflow": {"handlers": ["console"], "level": "INFO"},
        # Server errors, with their tracebacks, in the service's log
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}
