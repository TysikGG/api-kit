"""Shared request building and response parsing for the sync and async clients."""

from __future__ import annotations

from typing import Any

import httpx

from .errors import CapMonsterError, create_error, describe_error

DEFAULT_BASE_URL = "https://api.capmonster.cloud"
DEFAULT_USER_AGENT_URL = "https://capmonster.cloud/api/useragent/actual"
DEFAULT_TIMEOUT = 30.0

# Developer software id sent as `softId` on createTask.
#
# TODO: CapMonster Cloud's developer program is pending approval, so no
# softId has been issued yet. Leave this empty. When a numeric id is
# assigned, set it here. Requests omit `softId` until this constant or the
# client `soft_id` argument is a non-empty value.
#
# The createTask field name is `softId` (same name as the official client).
# https://docs.capmonster.cloud/docs/api/methods/create-task/
DEFAULT_SOFT_ID = ""


def effective_client_key(
    client_key: str,
    *,
    module_name: str | None = None,
    recognizing_threshold: int | None = None,
    nocache: bool = False,
) -> str:
    """Apply documented client-key suffixes: module, threshold, then nocache."""
    key = client_key
    if module_name and module_name.strip():
        key = f"{key}__{module_name.strip()}"
    if recognizing_threshold is not None:
        key = f"{key}__recognizingthreshold_{recognizing_threshold}"
    if nocache:
        key = f"{key}__nocache"
    return key


def has_soft_id(value: str | int | None) -> bool:
    """True when a softId should be sent. Empty string and 0 are treated as unset."""
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    return value != 0


def format_soft_id(value: str | int) -> str | int:
    """CapMonster expects a numeric softId. Numeric strings are sent as integers."""
    if isinstance(value, int):
        return value
    trimmed = value.strip()
    if trimmed.isdigit():
        return int(trimmed)
    return trimmed


def normalize_task_id(task_id: Any) -> int | None:
    """Return a positive integer task id, or None when the value cannot be used."""
    if task_id is None or task_id == "":
        return None
    if isinstance(task_id, bool):
        return None
    if isinstance(task_id, float) and not task_id.is_integer():
        return None
    try:
        value = int(task_id)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    return value


def require_task_id(task_id: Any) -> int:
    normalized = normalize_task_id(task_id)
    if normalized is None:
        raise create_error(f"Invalid taskId: {task_id}", 1, "WRONG_CAPTCHA_ID")
    return normalized


def build_create_payload(
    client_key: str,
    task: dict[str, Any],
    *,
    soft_id: str | int | None,
    callback_url: str | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"clientKey": client_key, "task": task}
    if has_soft_id(soft_id):
        assert soft_id is not None
        payload["softId"] = format_soft_id(soft_id)
    if callback_url:
        payload["callbackUrl"] = callback_url
    return payload


def interpret_response(res: httpx.Response) -> dict[str, Any]:
    """Return a successful JSON object or raise CapMonsterError."""
    try:
        data = res.json()
    except ValueError:
        data = None

    if res.is_error:
        error_id = data.get("errorId", 0) if isinstance(data, dict) else 0
        error_code = data.get("errorCode") if isinstance(data, dict) else None
        error_description = data.get("errorDescription") if isinstance(data, dict) else None
        if isinstance(data, dict) and (error_description or error_code or error_id):
            error_msg = describe_error(error_code, error_description, int(error_id or 0))
        else:
            error_msg = res.text or f"HTTP {res.status_code}"
        raise create_error(error_msg, int(error_id or 0), error_code, res.status_code, data)

    if not isinstance(data, dict):
        raise create_error(
            "Unexpected non-JSON response from CapMonster Cloud API",
            0,
            None,
            res.status_code,
            res.text,
        )

    error_id = int(data.get("errorId", 0) or 0)
    if error_id != 0:
        error_code = data.get("errorCode")
        msg = describe_error(error_code, data.get("errorDescription"), error_id)
        raise create_error(msg, error_id, error_code, res.status_code, data)

    return data


def balance_from(data: dict[str, Any]) -> dict[str, float]:
    return {"balance": float(data.get("balance", 0.0))}


def task_id_from(data: dict[str, Any]) -> int:
    task_id = normalize_task_id(data.get("taskId"))
    if task_id is None:
        raise create_error(
            "Response missing taskId",
            int(data.get("errorId", 0) or 0),
            data.get("errorCode"),
            200,
            data,
        )
    return task_id


def result_from(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": data.get("status", "processing"),
        "solution": data.get("solution", {}),
    }


def report_from(data: dict[str, Any]) -> dict[str, str]:
    status = data.get("status")
    if status and status != "success":
        raise create_error(
            f"Report was not accepted (status: {status})",
            int(data.get("errorId", 0) or 0),
            data.get("errorCode"),
            200,
            data,
        )
    return {"status": "success"}


def user_agent_from(text: str, status_code: int) -> str:
    cleaned = text.strip()
    if not cleaned:
        raise create_error("Empty user agent response", 0, "EMPTY_USER_AGENT", status_code, text)
    return cleaned


def solution_is_ready(result: dict[str, Any]) -> bool:
    return result.get("status") == "ready" and bool(result.get("solution"))


def as_solution(solution: Any) -> dict[str, Any]:
    if isinstance(solution, dict):
        return solution
    return {"value": solution}


def timeout_error() -> CapMonsterError:
    return create_error("Timed out waiting for captcha solution", 0, "TIMEOUT")


def aborted_error(message: str = "Operation aborted") -> CapMonsterError:
    return create_error(message, 0, "ABORTED")
