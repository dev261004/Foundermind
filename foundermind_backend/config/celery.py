import os
from celery import Celery

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "foundermind_backend.settings.development"
)

app = Celery("foundermind")

app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()