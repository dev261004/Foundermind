from django.core.management.base import BaseCommand

from integrations.model_validator import validate_configured_models


class Command(BaseCommand):
    help = "Validate AGENT_MODELS against the currently available Google GenAI model ids."

    def handle(self, *args, **options):
        validate_configured_models()
        self.stdout.write(self.style.SUCCESS("All configured AGENT_MODELS values are valid."))
