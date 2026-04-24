import concurrent.futures
import logging
import os
import threading
import time
from socket import timeout as SocketTimeout

from dotenv import load_dotenv
from django.conf import settings
from google import genai
from google.genai import errors, types
from requests.exceptions import Timeout as RequestsTimeout

from core.exceptions import LLMQuotaExhaustedError

load_dotenv()

logger = logging.getLogger(__name__)
_GENAI_CONFIG_LOCK = threading.Lock()
_GENAI_CLIENT_PID: int | None = None
_GENAI_CLIENT: genai.Client | None = None

GEMINI_REQUEST_TIMEOUT_SECONDS = 60
GEMINI_CALL_GUARD_TIMEOUT_SECONDS = 65
PRIMARY_RATE_LIMIT_BACKOFFS = (15, 30, 60)
FALLBACK_RATE_LIMIT_BACKOFFS = (15, 30)
TRANSIENT_RETRY_DELAY_SECONDS = 10
TRANSIENT_MAX_RETRIES = 2
TRANSIENT_ERRORS = (
    RequestsTimeout,
    SocketTimeout,
    TimeoutError,
)


class LLMResponse(str):
    def __new__(cls, text: str, model_used: str):
        instance = super().__new__(cls, text)
        instance.model_used = model_used
        return instance


def _get_api_error_status(exc: Exception) -> int | None:
    status = getattr(exc, "status", None)
    if isinstance(status, int):
        return status
    code = getattr(exc, "code", None)
    if isinstance(code, int):
        return code
    return None


def _is_rate_limit_error(exc: Exception) -> bool:
    return isinstance(exc, errors.APIError) and _get_api_error_status(exc) == 429


def _is_transient_api_error(exc: Exception) -> bool:
    status = _get_api_error_status(exc)
    return isinstance(exc, errors.APIError) and status in {500, 502, 503, 504}


def _get_genai_client() -> genai.Client:
    global _GENAI_CLIENT_PID, _GENAI_CLIENT

    current_pid = os.getpid()
    if _GENAI_CLIENT_PID == current_pid and _GENAI_CLIENT is not None:
        return _GENAI_CLIENT

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is required for Gemini calls.")

    with _GENAI_CONFIG_LOCK:
        if _GENAI_CLIENT_PID == current_pid and _GENAI_CLIENT is not None:
            return _GENAI_CLIENT

        if _GENAI_CLIENT is not None and _GENAI_CLIENT_PID != current_pid:
            try:
                _GENAI_CLIENT.close()
            except Exception:
                pass

        _GENAI_CLIENT = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=GEMINI_REQUEST_TIMEOUT_SECONDS * 1000,
            ),
        )
        _GENAI_CLIENT_PID = current_pid
        logger.info("Created Google GenAI client in pid=%s", current_pid)
        return _GENAI_CLIENT


def _extract_response_text(response) -> str:
    try:
        text = response.text
        if text:
            return text.strip()
    except Exception:
        pass

    parts = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                parts.append(part_text.strip())

    text = "\n".join(part for part in parts if part).strip()
    if text:
        return text

    raise ValueError("LLM response did not contain any text output.")


def _generate_content(prompt: str, model_name: str) -> str:
    client = _get_genai_client()
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
    )
    return _extract_response_text(response)


def _generate_content_with_guard(prompt: str, model_name: str) -> str:
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_generate_content, prompt, model_name)
    try:
        return future.result(timeout=GEMINI_CALL_GUARD_TIMEOUT_SECONDS)
    except concurrent.futures.TimeoutError as exc:
        future.cancel()
        logger.error(
            "LLM call exceeded guard timeout model=%s timeout_seconds=%s",
            model_name,
            GEMINI_CALL_GUARD_TIMEOUT_SECONDS,
        )
        raise TimeoutError(
            f"LLM call exceeded {GEMINI_CALL_GUARD_TIMEOUT_SECONDS} seconds"
        ) from exc
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def call_llm(
    prompt: str,
    model: str,
    fallback_model: str | None = None,
) -> LLMResponse:
    if not model:
        raise ValueError("A primary model name is required.")

    last_exception = None
    models_to_try = [(model, PRIMARY_RATE_LIMIT_BACKOFFS)]

    if fallback_model and fallback_model != model:
        models_to_try.append((fallback_model, FALLBACK_RATE_LIMIT_BACKOFFS))

    for model_index, (active_model, rate_limit_backoffs) in enumerate(models_to_try):
        rate_limit_retry_index = 0
        transient_retry_count = 0

        while True:
            try:
                logger.info("Starting LLM call model=%s", active_model)
                text = _generate_content_with_guard(prompt, active_model)
                logger.info(
                    "LLM call succeeded model=%s response_length=%s",
                    active_model,
                    len(text),
                )
                return LLMResponse(text, active_model)
            except Exception as exc:
                if _is_rate_limit_error(exc):
                    last_exception = exc
                    if rate_limit_retry_index >= len(rate_limit_backoffs):
                        if model_index == 0 and len(models_to_try) > 1:
                            logger.warning(
                                "Switching to fallback model after repeated rate limits on model=%s fallback_model=%s",
                                active_model,
                                models_to_try[1][0],
                            )
                            break

                        raise LLMQuotaExhaustedError(
                            message=(
                                "LLM quota exhausted after trying models: "
                                f"{model}"
                                + (f", {fallback_model}" if fallback_model else "")
                            ),
                            primary_model=model,
                            fallback_model=fallback_model,
                        ) from last_exception

                    wait_time = rate_limit_backoffs[rate_limit_retry_index]
                    rate_limit_retry_index += 1
                    logger.warning(
                        "Rate limited LLM call model=%s retry=%s wait_seconds=%s error=%s",
                        active_model,
                        rate_limit_retry_index,
                        wait_time,
                        _get_api_error_status(exc) or exc.__class__.__name__,
                    )
                    time.sleep(wait_time)
                    continue

                if _is_transient_api_error(exc) or isinstance(exc, TRANSIENT_ERRORS):
                    last_exception = exc
                    if transient_retry_count >= TRANSIENT_MAX_RETRIES:
                        logger.error(
                            "LLM call failed after transient retries model=%s error=%s",
                            active_model,
                            _get_api_error_status(exc) or exc.__class__.__name__,
                        )
                        raise

                    transient_retry_count += 1
                    logger.warning(
                        "Retrying transient LLM failure model=%s attempt=%s wait_seconds=%s error=%s",
                        active_model,
                        transient_retry_count,
                        TRANSIENT_RETRY_DELAY_SECONDS,
                        _get_api_error_status(exc) or exc.__class__.__name__,
                    )
                    time.sleep(TRANSIENT_RETRY_DELAY_SECONDS)
                    continue

                raise


def generate_text(prompt: str) -> LLMResponse:
    primary_model = settings.AGENT_MODELS["planner"]
    fallback_model = settings.AGENT_MODELS["fallback_gemini"]
    return call_llm(prompt, model=primary_model, fallback_model=fallback_model)
