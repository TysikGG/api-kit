"""Synchronous client for the Peak Solutions CAPTCHA solving API."""

from __future__ import annotations

import time
from collections.abc import Callable, Mapping
from typing import Any

import httpx

from .constants import APP_ID, DEFAULT_BASE_URL, DEFAULT_RETRY_DELAY, DEFAULT_TIMEOUT
from .errors import ErrorCode, PeakError, RetryTimeoutError, classify_error, is_retryable
from .protocol import (
    attach_app_id,
    build_aws_waf,
    build_cloudflare_5s,
    build_turnstile,
    read_balance,
    read_solve,
)
from .types import (
    AwsWafResult,
    BalanceData,
    Cloudflare5sResult,
    SolveEvent,
    TurnstileResult,
)
from .util import ProxyInput, assert_http_proxy, clamp_retries

ResultHook = Callable[[SolveEvent], None]


class Peak:
    """Client for the Peak CAPTCHA solving API.

    Solves return in the same HTTP call. There is no task id to poll.
    Use ``timeout`` for one request and ``retries`` for transient failures.

    Args:
        api_key: Peak API key (``pk_...``).
        base_url: API base URL. Defaults to ``https://api.peak.fo``.
        timeout: Request timeout in seconds. Defaults to 60.
        http_proxy: HTTP(S) proxy used only to reach the Peak API.
        retries: Extra attempts after a retryable failure. Defaults to 0.
        retry_delay: Seconds to wait between retries. Defaults to 1.
        retry_timeout: Optional wall-clock budget for the whole retry loop, in seconds.
        on_result: Called after every successful solve.

    Examples:
        >>> from peak import Peak
        >>> with Peak("pk_...") as client:
        ...     balance = client.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        http_proxy: str | None = None,
        retries: int = 0,
        retry_delay: float = DEFAULT_RETRY_DELAY,
        retry_timeout: float | None = None,
        on_result: ResultHook | None = None,
    ) -> None:
        if not api_key or not api_key.strip():
            raise PeakError("API key is required", 0, code=ErrorCode.MISSING_API_KEY)

        self._api_key = api_key.strip()
        self._retries = clamp_retries(retries, 0)
        self._retry_delay = retry_delay
        self._retry_timeout = retry_timeout
        self._on_result = on_result
        client_kwargs: dict[str, Any] = {
            "base_url": base_url.rstrip("/"),
            "timeout": timeout,
            "headers": {
                "X-API-Key": self._api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        }
        if http_proxy:
            client_kwargs["proxy"] = assert_http_proxy(http_proxy)
        self._http = httpx.Client(**client_kwargs)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> Peak:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def get_balance(
        self,
        *,
        retries: int | None = None,
        retry_delay: float | None = None,
        retry_timeout: float | None = None,
    ) -> BalanceData:
        """Retrieve the current account balance or package status.

        Does not spend credits.
        """

        def attempt() -> BalanceData:
            return read_balance(self._request("GET", "/balance"))

        return self._run(
            attempt,
            retries=retries,
            retry_delay=retry_delay,
            retry_timeout=retry_timeout,
            on_result=None,
            task_type="",
            emit=False,
        )

    def solve_turnstile(
        self,
        url: str,
        sitekey: str,
        *,
        proxy: ProxyInput | None = None,
        action: str | None = None,
        cdata: str | None = None,
        task_type: str | None = None,
        retries: int | None = None,
        retry_delay: float | None = None,
        retry_timeout: float | None = None,
        on_result: ResultHook | None = None,
    ) -> TurnstileResult:
        """Solve a Cloudflare Turnstile challenge.

        Uses ``TurnstileTaskProxyLess`` when ``proxy`` is omitted, or
        ``turnstiletask`` when a proxy is provided. ``task_type`` overrides that.
        Submit ``token`` as ``cf-turnstile-response``.
        """
        payload = build_turnstile(
            url,
            sitekey,
            proxy=proxy,
            action=action,
            cdata=cdata,
            task_type=task_type,
        )
        return self.solve(
            payload,
            retries=retries,
            retry_delay=retry_delay,
            retry_timeout=retry_timeout,
            on_result=on_result,
        )

    def solve_cloudflare_5s(
        self,
        url: str,
        proxy: ProxyInput,
        *,
        user_agent: str | None = None,
        html: str | None = None,
        task_type: str | None = None,
        retries: int | None = None,
        retry_delay: float | None = None,
        retry_timeout: float | None = None,
        on_result: ResultHook | None = None,
    ) -> Cloudflare5sResult:
        """Solve a Cloudflare 5-second challenge (WAF / Under Attack mode).

        ``proxy`` must be a sticky session proxy. Only Windows Chrome user-agents
        are accepted by Peak.
        """
        payload = build_cloudflare_5s(
            url,
            proxy,
            user_agent=user_agent,
            html=html,
            task_type=task_type,
        )
        return self.solve(
            payload,
            retries=retries,
            retry_delay=retry_delay,
            retry_timeout=retry_timeout,
            on_result=on_result,
        )

    def solve_cloudflare_waf(
        self,
        url: str,
        proxy: ProxyInput,
        *,
        user_agent: str | None = None,
        html: str | None = None,
        task_type: str | None = None,
        retries: int | None = None,
        retry_delay: float | None = None,
        retry_timeout: float | None = None,
        on_result: ResultHook | None = None,
    ) -> Cloudflare5sResult:
        """Alias of :meth:`solve_cloudflare_5s`. Matches the official Python SDK name."""
        return self.solve_cloudflare_5s(
            url,
            proxy,
            user_agent=user_agent,
            html=html,
            task_type=task_type,
            retries=retries,
            retry_delay=retry_delay,
            retry_timeout=retry_timeout,
            on_result=on_result,
        )

    def solve_aws_waf(
        self,
        url: str,
        sdk_url: str,
        proxy: ProxyInput,
        user_agent: str,
        *,
        os: str = "ios",
        task_type: str | None = None,
        retries: int | None = None,
        retry_delay: float | None = None,
        retry_timeout: float | None = None,
        on_result: ResultHook | None = None,
    ) -> AwsWafResult:
        """Solve an AWS WAF challenge for an iOS or Android SDK (``awswaftask``).

        When Peak has this task disabled the call raises ``TaskDisabledError``.
        """
        payload = build_aws_waf(
            url,
            sdk_url,
            proxy,
            user_agent,
            os=os,
            task_type=task_type,
        )
        return self.solve(
            payload,
            retries=retries,
            retry_delay=retry_delay,
            retry_timeout=retry_timeout,
            on_result=on_result,
        )

    def solve(
        self,
        task: Mapping[str, Any],
        *,
        retries: int | None = None,
        retry_delay: float | None = None,
        retry_timeout: float | None = None,
        on_result: ResultHook | None = None,
    ) -> Any:
        """Send a raw solve body.

        The library app id is always written to ``appId`` and replaces any value
        already present on ``task``.
        """
        payload = attach_app_id(task)
        task_type = payload.get("task_type")
        task_name = task_type if isinstance(task_type, str) else ""

        def attempt() -> Any:
            return read_solve(self._request("POST", "/solve", json_data=payload))

        return self._run(
            attempt,
            retries=retries,
            retry_delay=retry_delay,
            retry_timeout=retry_timeout,
            on_result=on_result,
            task_type=task_name,
            emit=True,
        )

    def _run(
        self,
        attempt: Callable[[], Any],
        *,
        retries: int | None,
        retry_delay: float | None,
        retry_timeout: float | None,
        on_result: ResultHook | None,
        task_type: str,
        emit: bool,
    ) -> Any:
        resolved_retries = clamp_retries(retries, self._retries)
        delay = self._retry_delay if retry_delay is None else retry_delay
        budget = self._retry_timeout if retry_timeout is None else retry_timeout
        started = time.monotonic()
        attempt_no = 0
        while True:
            try:
                data = attempt()
            except PeakError as err:
                if not is_retryable(err) or attempt_no >= resolved_retries:
                    raise
                attempt_no += 1
                _check_budget(budget, started, err)
                if delay and delay > 0:
                    time.sleep(delay)
                _check_budget(budget, started, err)
                continue
            if emit:
                _emit(self._on_result, on_result, task_type, data)
            return data

    def _request(self, method: str, path: str, *, json_data: Any = None) -> Any:
        try:
            res = self._http.request(method, path, json=json_data)
        except httpx.TimeoutException as err:
            raise PeakError(str(err), 0, code=ErrorCode.REQUEST_TIMED_OUT) from err
        except httpx.HTTPError as err:
            raise PeakError(str(err), 0, code=ErrorCode.NETWORK) from err
        except RuntimeError as err:
            raise PeakError(str(err), 0, code=ErrorCode.NETWORK) from err
        return _decode(res)


def _decode(res: httpx.Response) -> Any:
    try:
        data = res.json()
    except ValueError:
        data = None
    if res.is_error:
        if isinstance(data, dict) and data.get("error"):
            message = str(data["error"])
        else:
            message = res.text or f"HTTP {res.status_code}"
        raise classify_error(message, res.status_code, data if data is not None else res.text)
    if not isinstance(data, dict):
        raise PeakError(
            "Unexpected non-JSON response from Peak API",
            res.status_code,
            data if data is not None else res.text,
        )
    return data


def _check_budget(budget: float | None, started: float, cause: BaseException) -> None:
    if budget is None:
        return
    if time.monotonic() - started >= budget:
        raise RetryTimeoutError("Retry timeout exceeded", cause)


__all__ = ["APP_ID", "Peak"]


def _emit(
    client_hook: ResultHook | None,
    call_hook: ResultHook | None,
    task_type: str,
    data: Any,
) -> None:
    event: SolveEvent = {"task_type": task_type, "data": data}
    if call_hook is not None:
        call_hook(event)
    if client_hook is not None and client_hook is not call_hook:
        client_hook(event)


