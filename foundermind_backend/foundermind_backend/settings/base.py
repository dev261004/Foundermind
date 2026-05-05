from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent

ENV_PATH = BASE_DIR / ".env"

# print("ENV_PATH:", ENV_PATH)
# print("ENV_EXISTS:", ENV_PATH.exists())

load_dotenv(dotenv_path=ENV_PATH)


def env(name, default=None, cast=None):
    value = os.getenv(name, default)
    if value is None or cast is None:
        return value
    return cast(value)

# print("MONGO_URI:", os.getenv("MONGO_URI"))

# ---------- SECURITY ----------
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
DEBUG = False
ALLOWED_HOSTS = []

# ---------- APPS ----------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # third party
    "rest_framework",
    "corsheaders",

    # local apps
    "apps.agent.apps.AgentConfig",
    "apps.users",
    "apps.ideas",
]

# ---------- MIDDLEWARE ----------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "foundermind_backend.urls"

# ---------- TEMPLATES ----------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": [
            "django.template.context_processors.debug",
            "django.template.context_processors.request",
            "django.contrib.auth.context_processors.auth",
            "django.contrib.messages.context_processors.messages",
        ]},
    },
]

WSGI_APPLICATION = "foundermind_backend.wsgi.application"
ASGI_APPLICATION = "foundermind_backend.asgi.application"

# ---------- DATABASE ----------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ---------- PASSWORD ----------
AUTH_PASSWORD_VALIDATORS = []

# ---------- I18N ----------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# ---------- STATIC ----------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ---------- MEDIA ----------
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ---------- DEFAULT PK ----------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------- DRF ----------
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ]
}

# ---------- CORS ----------
CORS_ALLOW_ALL_ORIGINS = True


CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = "redis://localhost:6379/0"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

AGENT_MODELS = {
    "planner": "gemini-2.5-flash",
    "critic": "gemini-3.1-flash-lite-preview",
    "reporter": "gemini-3.1-flash-lite-preview",
    "tool_heavy": "gemini-3.1-flash-lite-preview",
    "tool_light": "gemma-4-31b-it",
    "fallback_gemini": "gemini-2.5-flash-lite",
    "fallback_gemma": "gemma-3-27b-it",
}

PASSWORD_RESET_TOKEN_TTL_MINUTES = env("PASSWORD_RESET_TOKEN_TTL_MINUTES", 30, int)
PASSWORD_RESET_MAILER_KEY = os.getenv("PASSWORD_RESET_MAILER_KEY", "")

# Idea description limits
IDEA_DESCRIPTION_MIN_CHARS = 150
IDEA_DESCRIPTION_MAX_CHARS = 1000
IDEA_DESCRIPTION_AI_MAX_CHARS = 800   # truncation limit before sending to AI tools
IDEA_QUALITY_MIN_SCORE = 2            # minimum quality score (0-4) to proceed with analysis
