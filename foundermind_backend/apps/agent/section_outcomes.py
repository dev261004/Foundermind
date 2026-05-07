"""
Classify tool execution outcomes into structured section states
for section-level retry with cooldown support.
"""
import datetime
import uuid

from core.exceptions import LLMQuotaExhaustedError


# Outcome status constants
STATUS_SUCCESS = "success"
STATUS_RUNNING = "running"
STATUS_DATA_UNAVAILABLE = "data_unavailable"
STATUS_QUOTA_EXHAUSTED = "quota_exhausted"
STATUS_TEMPORARY_API_ERROR = "temporary_api_error"
STATUS_TOOL_ERROR = "tool_error"

# Error type constants matching the status values
ERROR_TYPES = {
    STATUS_DATA_UNAVAILABLE,
    STATUS_QUOTA_EXHAUSTED,
    STATUS_TEMPORARY_API_ERROR,
    STATUS_TOOL_ERROR,
}

RETRYABLE_STATUSES = {
    STATUS_DATA_UNAVAILABLE,
    STATUS_TEMPORARY_API_ERROR,
    STATUS_TOOL_ERROR,
}

COOLDOWN_SECONDS = 60

# Transient exception names that indicate a temporary failure
TRANSIENT_ERROR_NAMES = {
    "Timeout",
    "TimeoutError",
    "ConnectionError",
    "ConnectionResetError",
    "ConnectionRefusedError",
    "BrokenPipeError",
    "HTTPError",
    "RequestException",
    "RetryError",
    "ServiceUnavailable",
    "InternalServerError",
    "BadGatewayError",
    "GatewayTimeout",
    "ResourceExhausted",
    "TooManyRequests",
}


def classify_tool_outcome(
    tool_name: str,
    output,
    error: Exception | None = None,
    error_type_name: str | None = None,
) -> dict:
    """
    Classify a tool execution outcome into a structured section state dict.

    Returns a dict with keys:
        tool, status, retryable, error_type, message, cooldown_until,
        last_retry_at, retry_attempt_id
    """

    if error is not None:
        return _classify_error(tool_name, error, error_type_name)

    if _is_empty_output(output):
        return _build_state(
            tool_name,
            status=STATUS_DATA_UNAVAILABLE,
            retryable=True,
            error_type=STATUS_DATA_UNAVAILABLE,
            message=f"{tool_name} returned no data.",
            cooldown_seconds=COOLDOWN_SECONDS,
        )

    return _build_state(
        tool_name,
        status=STATUS_SUCCESS,
        retryable=False,
        error_type=None,
        message=f"{tool_name} completed successfully.",
        cooldown_seconds=0,
    )


def build_running_state(tool_name: str, retry_attempt_id: str | None = None) -> dict:
    """Build a section state for a tool that is currently running."""
    return {
        "tool": tool_name,
        "status": STATUS_RUNNING,
        "retryable": False,
        "error_type": None,
        "message": f"{tool_name} is running.",
        "cooldown_until": None,
        "last_retry_at": _now_iso(),
        "retry_attempt_id": retry_attempt_id or str(uuid.uuid4()),
    }


def generate_retry_attempt_id() -> str:
    """Generate a unique retry attempt identifier."""
    return str(uuid.uuid4())


def _classify_error(
    tool_name: str,
    error: Exception,
    error_type_name: str | None = None,
) -> dict:
    exc_name = error_type_name or type(error).__name__

    if isinstance(error, LLMQuotaExhaustedError):
        return _build_state(
            tool_name,
            status=STATUS_QUOTA_EXHAUSTED,
            retryable=True,
            error_type=STATUS_QUOTA_EXHAUSTED,
            message=f"{tool_name} failed: LLM quota exhausted.",
            cooldown_seconds=COOLDOWN_SECONDS,
        )

    if exc_name in TRANSIENT_ERROR_NAMES or _looks_transient(str(error)):
        return _build_state(
            tool_name,
            status=STATUS_TEMPORARY_API_ERROR,
            retryable=True,
            error_type=STATUS_TEMPORARY_API_ERROR,
            message=f"{tool_name} failed with a temporary error: {error}",
            cooldown_seconds=COOLDOWN_SECONDS,
        )

    return _build_state(
        tool_name,
        status=STATUS_TOOL_ERROR,
        retryable=True,
        error_type=STATUS_TOOL_ERROR,
        message=f"{tool_name} failed: {error}",
        cooldown_seconds=COOLDOWN_SECONDS,
    )


def _build_state(
    tool_name: str,
    *,
    status: str,
    retryable: bool,
    error_type: str | None,
    message: str,
    cooldown_seconds: int,
) -> dict:
    now = _now_iso()
    cooldown_until = None
    if cooldown_seconds > 0 and status != STATUS_SUCCESS:
        cooldown_until = (
            datetime.datetime.utcnow()
            + datetime.timedelta(seconds=cooldown_seconds)
        ).isoformat()

    return {
        "tool": tool_name,
        "status": status,
        "retryable": retryable,
        "error_type": error_type,
        "message": message,
        "cooldown_until": cooldown_until,
        "last_retry_at": now if status != STATUS_SUCCESS else None,
        "retry_attempt_id": None,
    }


def _is_empty_output(output) -> bool:
    """Check if a tool output should be considered empty/unavailable."""
    if output is None:
        return True
    if isinstance(output, (list, dict)) and len(output) == 0:
        return True
    if isinstance(output, str) and output.strip() == "":
        return True
    return False


def _looks_transient(error_message: str) -> bool:
    """Heuristic check for transient error indicators in message text."""
    lower = error_message.lower()
    transient_signals = [
        "timeout", "rate limit", "429", "503", "502", "504",
        "resource exhausted", "too many requests", "connection reset",
        "connection refused", "broken pipe", "service unavailable",
    ]
    return any(signal in lower for signal in transient_signals)


def _now_iso() -> str:
    return datetime.datetime.utcnow().isoformat()
