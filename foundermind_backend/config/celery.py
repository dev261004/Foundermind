import os
from celery import Celery

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "foundermind_backend.settings.development"
)

app = Celery("foundermind")

app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

from celery.schedules import crontab

app.conf.beat_schedule = {
    "drift-check-every-hour": {
        "task": "apps.analytics.tasks.drift_monitor_task",
        "schedule": 3600.0,  # every hour
    },
}

app.conf.beat_schedule.update({
    "idea-type-drift-check": {
        "task": "apps.analytics.tasks.idea_type_drift_monitor_task",
        "schedule": 3600.0,  # every hour
    }
})

app.conf.beat_schedule.update({
    "tool-drift-check": {
        "task": "apps.analytics.tasks.tool_drift_monitor_task",
        "schedule": 3600.0,
    }
})