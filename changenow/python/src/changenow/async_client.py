"""Async ChangeNOW client. Public methods match :class:`changenow.ChangeNow` and are awaited."""

import asyncio
import inspect
import time
from collections.abc import Callable
from typing import Any

import httpx

from .client import ChangeNow
from .errors import ChangeNowError, ChangeNowNetworkError, ChangeNowTimeoutError, create_error
from .link import TERMINAL_EXCHANGE_STATUSES


class AsyncChangeNow:
    """Async client for the ChangeNOW API.

    Every method that :class:`ChangeNow` exposes is available here and must be awaited,
    including helpers that do not perform I/O.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
        user_ip: str | None = None,
        *,
        retries: int = 2,
        retry_delay: float = 0.2,
        retry_unsafe: bool = False,
        proxy: str | None = None,
        v1_base_url: str | None = None,
        public_base_url: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        template = ChangeNow(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            user_agent=user_agent,
            user_ip=user_ip,
            retries=retries,
            retry_delay=retry_delay,
            retry_unsafe=retry_unsafe,
            proxy=proxy,
            v1_base_url=v1_base_url,
            public_base_url=public_base_url,
            headers=headers,
        )
        self.api_key = template.api_key
        self.base_url = template.base_url
        self.v1_base_url = template.v1_base_url
        self.public_base_url = template.public_base_url
        self.retries = template.retries
        self.retry_delay = template.retry_delay
        self.retry_unsafe = template.retry_unsafe
        self.proxy = template.proxy
        copied_headers = dict(template._client.headers)
        template.close()
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers=copied_headers,
            proxy=proxy,
        )

    async def aclose(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self.aclose()

    async def __aenter__(self) -> "AsyncChangeNow":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.aclose()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
        *,
        base_url: str | None = None,
        expect_text: bool = False,
    ) -> Any:
        from .client import _error_parts, _retry_after

        url = f"{base_url}{path}" if base_url else path
        retryable = method.upper() == "GET" or self.retry_unsafe
        attempts = max(0, self.retries) + 1
        last_error: ChangeNowError | None = None
        for attempt in range(1, attempts + 1):
            try:
                response = await self._client.request(method, url, params=params, json=json_data)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if expect_text or "text/plain" in content_type or "text/csv" in content_type:
                    return response.text
                if not response.content:
                    return None
                return response.json()
            except httpx.HTTPStatusError as exc:
                try:
                    data_err: Any = exc.response.json()
                except ValueError:
                    data_err = exc.response.text or None
                parts = _error_parts(data_err, "ChangeNOW API error")
                last_error = create_error(
                    message=parts["message"],
                    status_code=exc.response.status_code,
                    code=parts.get("code"),
                    response_body=data_err,
                    field=parts.get("field"),
                    field_errors=parts.get("field_errors"),
                    help=parts.get("help"),
                    retry_after=_retry_after(exc.response.headers.get("retry-after")),
                )
            except httpx.RequestError as exc:
                last_error = ChangeNowNetworkError(f"HTTP request failed: {exc}")
            status = last_error.status_code
            can_retry = (
                retryable
                and attempt < attempts
                and (
                    isinstance(last_error, ChangeNowNetworkError)
                    or status in {408, 429}
                    or (status is not None and status >= 500)
                    or last_error.code in {"RATE_LIMITED", "UPSTREAM_UNAVAILABLE", "INTERNAL_ERROR"}
                )
            )
            if not can_retry:
                raise last_error
            delay = (
                last_error.retry_after
                if last_error.retry_after is not None
                else self.retry_delay * (2 ** (attempt - 1))
            )
            await asyncio.sleep(delay)
        raise last_error or ChangeNowError("ChangeNOW API request failed")

    async def wait_for_exchange(
        self,
        exchange_id: str,
        *,
        timeout: float = 600.0,
        interval: float = 5.0,
        terminal_statuses: tuple[str, ...] | list[str] | None = None,
        on_status: Callable[[str, dict[str, Any]], None] | None = None,
    ) -> Any:
        """Poll until the partner exchange status is terminal."""
        return await self._poll(
            lambda: self.get_exchange(exchange_id),
            timeout=timeout,
            interval=interval,
            terminal_statuses=terminal_statuses,
            on_status=on_status,
        )

    async def wait_for_public_transaction(
        self,
        transaction_id: str,
        *,
        timeout: float = 600.0,
        interval: float = 5.0,
        terminal_statuses: tuple[str, ...] | list[str] | None = None,
        on_status: Callable[[str, dict[str, Any]], None] | None = None,
        sub_id: str | None = None,
    ) -> Any:
        """Poll until the anonymous version-3 order is terminal."""
        return await self._poll(
            lambda: self.get_public_transaction(transaction_id, sub_id=sub_id),
            timeout=timeout,
            interval=interval,
            terminal_statuses=terminal_statuses,
            on_status=on_status,
        )

    async def list_all_assets(
        self,
        q: str | None = None,
        network: str | None = None,
        kind: str | None = None,
        fixed_rate: bool | None = None,
        popular: bool | None = None,
        limit: int | None = None,
        max_pages: int = 100,
    ) -> list[dict[str, Any]]:
        """Follow catalogue cursors until the selection is complete."""
        assets: list[dict[str, Any]] = []
        cursor: str | None = None
        for _page in range(max_pages):
            envelope = await self.list_assets(
                q=q,
                network=network,
                kind=kind,
                fixed_rate=fixed_rate,
                popular=popular,
                limit=limit,
                cursor=cursor,
            )
            assets.extend(envelope.get("assets") or [])
            if not envelope.get("has_more") or not envelope.get("next_cursor"):
                return assets
            cursor = envelope.get("next_cursor")
        return assets

    async def _poll(
        self,
        fetch: Callable[[], Any],
        *,
        timeout: float,
        interval: float,
        terminal_statuses: tuple[str, ...] | list[str] | None,
        on_status: Callable[[str, dict[str, Any]], None] | None,
    ) -> Any:
        terminal = set(terminal_statuses or TERMINAL_EXCHANGE_STATUSES)
        started = time.monotonic()
        last: Any = None
        while True:
            row = fetch()
            if inspect.isawaitable(row):
                row = await row
            if isinstance(row, str):
                raise ChangeNowError("Expected a JSON exchange status, received text")
            last = row
            status = str(row.get("status") or "")
            if on_status is not None:
                on_status(status, row)
            if status in terminal:
                return row
            if time.monotonic() - started >= timeout:
                raise ChangeNowTimeoutError(
                    f"Timed out after {timeout}s waiting for a terminal exchange status "
                    f"(last status: {status or 'unknown'})",
                    response_body=last,
                )
            remaining = timeout - (time.monotonic() - started)
            await asyncio.sleep(min(interval, max(0.0, remaining)))

    def __getattribute__(self, name: str) -> Any:
        try:
            attr = object.__getattribute__(self, name)
        except AttributeError:
            fn = getattr(ChangeNow, name, None)
            if fn is None or not callable(fn):
                raise
            attr = fn.__get__(self, type(self))
            if name.startswith("_"):
                return attr
        if name.startswith("_") or inspect.iscoroutinefunction(attr) or not callable(attr):
            return attr

        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            result = attr(*args, **kwargs)
            if inspect.isawaitable(result):
                return await result
            return result

        return wrapper
