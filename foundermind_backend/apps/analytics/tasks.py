from celery import shared_task

from apps.analytics.drift_detector import DriftDetector
from apps.analytics.tool_drift_detector import ToolDriftDetector


@shared_task
def drift_monitor_task():
    return DriftDetector.auto_recalibrate_all()


@shared_task
def idea_type_drift_monitor_task():
    return DriftDetector.auto_recalibrate_per_type()


@shared_task
def tool_drift_monitor_task():
    return ToolDriftDetector.detect_tool_drift()
