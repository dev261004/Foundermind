from django.apps import AppConfig


class AgentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.agent"

    def ready(self):
        from integrations.model_validator import validate_configured_models_once

        validate_configured_models_once()
