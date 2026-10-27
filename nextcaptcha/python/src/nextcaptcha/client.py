"""Client for the NextCaptcha recognition API."""

from __future__ import annotations

import time
from collections.abc import Mapping
from typing import Any

import httpx

from .errors import NextCaptchaError, describe_error

_DEFAULT_BASE_URL = "https://api.nextcaptcha.com"
_DEFAULT_TOKEN_BASE_URL = "https://api-v2.nextcaptcha.com"
_DEFAULT_TIMEOUT = 30.0

# Developer software id sent as the top-level `softId` string on every task
# request (`createTask` and `getToken`).
#
# NextCaptcha attributes developer revenue through this field. It sits next
# to `clientKey` and `task`, not inside the task object. The createTask and
# getToken docs type it as a string.
#
# https://nextcaptcha.com/apidocs/create-task
# https://nextcaptcha.com/apidocs/get-token
DEFAULT_SOFT_ID = "next_softId_b3bdc0a2f7035cc72e1d62d575469f449d"


class NextCaptcha:
    """Client for the NextCaptcha recognition API.

    Args:
        client_key: NextCaptcha client key.
        base_url: API base URL for createTask, getTaskResult, and getBalance.
        token_base_url: Base URL for getToken. Defaults to `https://api-v2.nextcaptcha.com`.
        timeout: Request timeout in seconds (defaults to 30.0).
        soft_id: Developer software id. Sent as `softId` on every task request.
            Pass an empty string to omit the field.

    Examples:
        >>> from nextcaptcha import NextCaptcha
        >>> with NextCaptcha("your_client_key") as client:
        ...     balance = client.get_balance()
    """

    def __init__(
        self,
        client_key: str,
        *,
        base_url: str = _DEFAULT_BASE_URL,
        token_base_url: str = _DEFAULT_TOKEN_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
        soft_id: str | None = None,
    ) -> None:
        if not client_key or not client_key.strip():
            raise NextCaptchaError("Client key is required", 1, "MISSING_CLIENT_KEY")

        self._client_key = client_key.strip()
        self._soft_id = DEFAULT_SOFT_ID if soft_id is None else soft_id
        self._token_base_url = token_base_url.rstrip("/")
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> NextCaptcha:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def get_balance(self) -> dict[str, float]:
        """Retrieve the available account balance.

        Does not spend credit and does not send ``softId``. The API returns
        ``balance`` as a decimal string; this method parses it to a float.
        """
        response = self._post("/getBalance", {"clientKey": self._client_key})
        return {"balance": parse_balance(response.get("balance"))}

    def create_task(
        self,
        task: Mapping[str, Any],
        *,
        soft_id: str | None = None,
        callback_url: str | None = None,
    ) -> int:
        """Submit a new captcha recognition task.

        ``softId`` is included on every task request unless it is set to an empty string.

        Args:
            task: Task dictionary (must include ``type``).
            soft_id: Override the client software id for this call.
            callback_url: Optional URL that receives the solution.

        Returns:
            The submitted numeric task ID.
        """
        response = self._post("/createTask", self._task_payload(task, soft_id, callback_url))
        task_id = normalize_task_id(response.get("taskId"))
        if task_id is None:
            raise NextCaptchaError(
                "Response missing taskId",
                response.get("errorId", 0),
                response.get("errorCode"),
                200,
                response,
            )
        return task_id

    def get_task_result(self, task_id: int | str) -> dict[str, Any]:
        """Query the status and solution of a submitted task.

        ``processing`` and ``pending`` are returned so callers can keep polling.
        ``failed`` and every API error are raised.

        Args:
            task_id: Task identifier returned by ``create_task``.

        Returns:
            Dictionary containing ``status`` and optional ``solution``.
        """
        normalized = normalize_task_id(task_id)
        if normalized is None:
            raise NextCaptchaError(
                f"Invalid taskId: {task_id}",
                16,
                "ERROR_NO_SUCH_CAPCHA_ID",
            )

        response = self._post(
            "/getTaskResult",
            {"clientKey": self._client_key, "taskId": normalized},
        )
        if response.get("status") == "failed":
            error_id = int(response.get("errorId", 12) or 12)
            error_code = response.get("errorCode") or "ERROR_CAPTCHA_UNSOLVABLE"
            raise NextCaptchaError(
                describe_error(error_code, response.get("errorDescription"), error_id),
                error_id,
                error_code,
                200,
                response,
            )

        return {
            "status": response.get("status", "processing"),
            "solution": response.get("solution", {}),
        }

    def get_token(
        self,
        task: Mapping[str, Any],
        *,
        soft_id: str | None = None,
        callback_url: str | None = None,
    ) -> str:
        """Create a task and return the token in one call.

        ``getToken`` is served from ``https://api-v2.nextcaptcha.com/getToken``.
        A success body is ``0|TOKEN``. A failure body is ``1|ERROR_MSG``.
        ``softId`` is sent the same way as on ``create_task``.
        """
        url = f"{self._token_base_url}/getToken"
        text = self._post_text(url, self._task_payload(task, soft_id, callback_url))
        return parse_token_body(text)

    def wait_for_result(
        self,
        task_id: int | str,
        *,
        timeout: float = 120.0,
        interval: float = 1.0,
    ) -> dict[str, Any]:
        """Poll ``get_task_result`` until the solution is ready.

        Args:
            task_id: Task identifier.
            timeout: Maximum wait time in seconds (defaults to 120.0).
            interval: Delay between poll attempts in seconds (defaults to 1.0).

        Returns:
            The solution dictionary.

        Raises:
            NextCaptchaError: If polling times out or the task fails.
        """
        start_time = time.monotonic()

        while True:
            res = self.get_task_result(task_id)
            if res.get("status") == "ready" and res.get("solution"):
                solution = res["solution"]
                if isinstance(solution, dict):
                    return solution
                return {"value": solution}

            if time.monotonic() - start_time >= timeout:
                raise NextCaptchaError(
                    "Timed out waiting for captcha solution",
                    0,
                    "TIMEOUT",
                )

            time.sleep(interval)

    def solve(
        self,
        task: Mapping[str, Any],
        *,
        timeout: float = 120.0,
        interval: float = 1.0,
        soft_id: str | None = None,
        callback_url: str | None = None,
    ) -> dict[str, Any]:
        """Submit a task and wait for its solution.

        Args:
            task: Task dictionary.
            timeout: Maximum wait time in seconds.
            interval: Delay between poll attempts in seconds.
            soft_id: Override the client software id for this call.
            callback_url: Optional result callback URL.

        Returns:
            The solution dictionary.
        """
        task_id = self.create_task(task, soft_id=soft_id, callback_url=callback_url)
        return self.wait_for_result(task_id, timeout=timeout, interval=interval)

    def _task_payload(
        self,
        task: Mapping[str, Any],
        soft_id: str | None,
        callback_url: str | None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "clientKey": self._client_key,
            "task": dict(task),
        }
        chosen = self._soft_id if soft_id is None else soft_id
        if has_soft_id(chosen):
            payload["softId"] = chosen.strip()
        if callback_url:
            payload["callbackUrl"] = callback_url
        return payload

    def _post(self, path: str, json_data: Any) -> dict[str, Any]:
        data, status_code = self._send(path, json_data)
        if not isinstance(data, dict):
            raise NextCaptchaError(
                "Unexpected non-JSON response from NextCaptcha API",
                0,
                None,
                status_code,
                data,
            )
        return data

    def _post_text(self, path: str, json_data: Any) -> str:
        data, status_code = self._send(path, json_data)
        if isinstance(data, str):
            return data
        raise NextCaptchaError(
            "Unexpected getToken response",
            0,
            "ERROR_UNKNOWN",
            status_code,
            data,
        )

    def _send(self, path: str, json_data: Any) -> tuple[Any, int]:
        try:
            res = self._http.post(path, json=json_data)
        except httpx.HTTPError as err:
            raise NextCaptchaError(str(err), 0) from err

        data: Any
        text = res.text
        try:
            data = res.json()
        except ValueError:
            data = text

        if res.is_error:
            error_id = data.get("errorId", 0) if isinstance(data, dict) else 0
            error_code = data.get("errorCode") if isinstance(data, dict) else None
            error_description = data.get("errorDescription") if isinstance(data, dict) else None
            if isinstance(data, dict) and (error_description or error_code or error_id):
                error_msg = describe_error(error_code, error_description, error_id)
            else:
                error_msg = text or f"HTTP {res.status_code}"
            raise NextCaptchaError(error_msg, error_id, error_code, res.status_code, data)

        if isinstance(data, dict) and data.get("errorId", 0) != 0:
            error_id = int(data.get("errorId", 0))
            error_code = data.get("errorCode")
            msg = describe_error(error_code, data.get("errorDescription"), error_id)
            raise NextCaptchaError(msg, error_id, error_code, res.status_code, data)

        return data, res.status_code


def has_soft_id(value: str | None) -> bool:
    """True when a softId should be sent. Empty and whitespace-only strings are omitted."""
    return isinstance(value, str) and value.strip() != ""


def parse_balance(value: Any) -> float:
    """Parse the documented string balance, and accept a number if the API sends one."""
    if isinstance(value, bool) or value is None:
        raise NextCaptchaError(
            "Response missing balance",
            0,
            "ERROR_UNKNOWN",
            200,
            {"balance": value},
        )
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and value.strip():
        try:
            return float(value)
        except ValueError:
            pass
    raise NextCaptchaError("Response missing balance", 0, "ERROR_UNKNOWN", 200, {"balance": value})


def parse_token_body(text: str) -> str:
    """Parse a getToken body of ``0|TOKEN`` or ``1|ERROR_MSG``."""
    trimmed = text.strip()
    separator = trimmed.find("|")
    if separator > 0:
        status = trimmed[:separator]
        rest = trimmed[separator + 1 :]
        if status == "0" and rest:
            return rest
        if status == "1":
            raise NextCaptchaError(
                rest or "getToken failed",
                1,
                rest or "ERROR_UNKNOWN",
                200,
                trimmed,
            )
    raise NextCaptchaError("Unexpected getToken response", 0, "ERROR_UNKNOWN", 200, trimmed)


def normalize_task_id(task_id: Any) -> int | None:
    """Return a positive integer task id, or None when the value cannot be used."""
    if task_id is None or task_id == "":
        return None
    try:
        value = int(task_id)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    return value
