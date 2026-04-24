class LLMQuotaExhaustedError(Exception):
    def __init__(
        self,
        message: str | None = None,
        primary_model: str | None = None,
        fallback_model: str | None = None,
    ) -> None:
        self.primary_model = primary_model
        self.fallback_model = fallback_model

        if message is None:
            tried_models = [model for model in (primary_model, fallback_model) if model]
            message = (
                "LLM quota exhausted after trying models: "
                + ", ".join(tried_models)
                if tried_models
                else "LLM quota exhausted."
            )

        super().__init__(message)
