"""
Run this once at startup to verify all configured model strings are valid.
Call it from app startup or manually via the validate_models management command.
"""

import logging
import os
import sys

from django.conf import settings
from google import genai

logger = logging.getLogger(__name__)

_VALIDATION_RAN = False


def validate_configured_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is required to validate AGENT_MODELS.")

    client = genai.Client(api_key=api_key)
    try:
        available = {model.name.replace("models/", "") for model in client.models.list()}
    finally:
        client.close()

    errors = []
    for role, model_id in settings.AGENT_MODELS.items():
        if model_id not in available:
            errors.append(f"  AGENT_MODELS['{role}'] = '{model_id}' NOT FOUND in API")
        else:
            logger.info("Validated AGENT_MODELS[%s]=%s", role, model_id)

    if errors:
        logger.error("INVALID MODEL STRINGS:\n%s", "\n".join(errors))
        raise ValueError("Fix AGENT_MODELS in settings before running agents.")


def validate_configured_models_once():
    global _VALIDATION_RAN

    if _VALIDATION_RAN or os.getenv("DISABLE_MODEL_VALIDATION") == "1":
        return

    # Avoid touching the Gemini SDK in the Celery parent process before prefork workers spawn.
    if any(arg in {"celery", "worker", "beat"} for arg in sys.argv):
        logger.info("Skipping AGENT_MODELS validation during Celery startup.")
        return

    _VALIDATION_RAN = True
    validate_configured_models()
