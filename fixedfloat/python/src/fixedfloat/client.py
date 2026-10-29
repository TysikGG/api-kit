"""FixedFloat API v2 client implementation."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import time
from collections.abc import Callable
from typing import Any

import httpx

from .errors import (
    FixedFloatApiError,
    FixedFloatAuthError,
    FixedFloatError,
    FixedFloatHttpError,
    FixedFloatNetworkError,
    FixedFloatRateLimitError,
    FixedFloatTimeoutError,
)
from .parse import (
    DEFAULT_REFCODE,
    TERMINAL_ORDER_STATUSES,
    assert_quote_ok,
    create_payload,
    emergency_payload,
    filter_rates,
    order_status_text,
    parse_currencies,
    parse_order,
    parse_price,
    parse_price_shorthand,
    parse_qr,
    parse_rates_xml,
    price_payload,
)
from .types import (
    Currency,
    EmergencyChoice,
    ExchangeDirection,
    Order,
    OrderType,
    PriceResult,
    QrCode,
    QrResult,
    RateItem,
)

DEFAULT_BASE_URL = "https://ff.io/api/v2"
DEFAULT_RATES_BASE_URL = "https://ff.io"
DEFAULT_TIMEOUT = 15.0
DEFAULT_RETRIES = 2
DEFAULT_RETRY_DELAY = 0.2
DEFAULT_WAIT_TIMEOUT = 30 * 60.0
DEFAULT_WAIT_INTERVAL = 5.0

__all__ = ["DEFAULT_REFCODE", "AsyncFixedFloat", "FixedFloat"]


def _dumps(payload: dict[str, Any] | None) -> bytes:
    return json.dumps(payload or {}, separators=(",", ":")).encode("utf-8")


def _auth_headers(
    api_key: str | None,
    api_secret: str | None,
    body: bytes,
    extra: dict[str, str],
) -> dict[str, str]:
    headers = dict(extra)
    if api_key:
        headers["X-API-KEY"] = api_key
    if api_secret:
        headers["X-API-SIGN"] = hmac.new(
            api_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
    return headers


def _error_for_status(status: int, data: Any, fallback: str) -> FixedFloatError:
    if status == 429:
        code = (
            data.get("code")
            if isinstance(data, dict) and isinstance(data.get("code"), int)
            else status
        )
        message = data.get("msg") if isinstance(data, dict) and data.get("msg") else fallback
        payload = data.get("data") if isinstance(data, dict) else data
        return FixedFloatRateLimitError(str(message), code=code, data=payload, status=status)
    if status in (401, 403):
        code = (
            data.get("code")
            if isinstance(data, dict) and isinstance(data.get("code"), int)
            else status
        )
        message = data.get("msg") if isinstance(data, dict) and data.get("msg") else fallback
        payload = data.get("data") if isinstance(data, dict) else data
        return FixedFloatAuthError(str(message), code=code, data=payload, status=status)
    return FixedFloatHttpError(fallback, status, data=data, retryable=status >= 500)


def decode_response(status_code: int, text: str) -> Any:
    """Turn an HTTP body into the FixedFloat ``data`` field or raise a typed error."""
    if not text:
        if status_code >= 400:
            raise _error_for_status(status_code, None, f"HTTP {status_code}")
        return None

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        if status_code >= 400:
            raise _error_for_status(
                status_code,
                text,
                f"Failed to parse response JSON: {text}",
            ) from exc
        raise FixedFloatError(
            f"Failed to parse response JSON: {text}",
            code=status_code,
        ) from exc

    if isinstance(data, dict) and "code" in data:
        code = data.get("code", 0)
        if code != 0:
            message = str(data.get("msg") or "FixedFloat API error")
            payload = data.get("data")
            numeric = code if isinstance(code, int) else status_code
            if status_code == 429:
                raise FixedFloatRateLimitError(
                    message, code=numeric, data=payload, status=status_code
                )
            if status_code in (401, 403):
                raise FixedFloatAuthError(message, code=numeric, data=payload, status=status_code)
            raise FixedFloatApiError(
                message,
                code=numeric,
                data=payload,
                retryable=status_code >= 500,
                status=status_code if status_code >= 400 else None,
            )
        return data.get("data")

    if status_code >= 400:
        raise _error_for_status(status_code, data, f"HTTP {status_code}")
    return data


def _client_kwargs(
    base_url: str,
    timeout: float,
    proxy: str | None,
) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "base_url": base_url,
        "timeout": timeout,
        "headers": {
            "Content-Type": "application/json; charset=UTF-8",
            "Accept": "application/json",
        },
    }
    if proxy:
        kwargs["proxy"] = proxy
    return kwargs


class FixedFloat:
    """Client for the FixedFloat cryptocurrency exchange REST API v2.

    Args:
        api_key: Your FixedFloat API key.
        api_secret: Your FixedFloat API secret for HMAC-SHA256 signatures.
        base_url: Base URL for FixedFloat API. Defaults to ``https://ff.io/api/v2``.
        timeout: Request timeout in seconds. Defaults to 15.
        proxy: Optional proxy URL, for example ``http://user:pass@127.0.0.1:8080``.
        retries: Extra attempts after a transient failure. Defaults to 2.
            ``POST /create`` is never retried.
        retry_delay: Base delay in seconds for exponential backoff. Defaults to 0.2.
        rates_base_url: Origin for the XML rates export. Defaults to ``https://ff.io``.
        headers: Extra headers sent on signed JSON requests. Auth headers overwrite these.

    Examples:
        >>> from fixedfloat import FixedFloat
        >>> client = FixedFloat(api_key="key", api_secret="secret")
        >>> currencies = client.get_currencies()
    """

    def __init__(
        self,
        api_key: str | None = None,
        api_secret: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        proxy: str | None = None,
        retries: int = DEFAULT_RETRIES,
        retry_delay: float = DEFAULT_RETRY_DELAY,
        rates_base_url: str = DEFAULT_RATES_BASE_URL,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.proxy = proxy
        self.retries = max(0, retries)
        self.retry_delay = max(0.0, retry_delay)
        self.rates_base_url = rates_base_url.rstrip("/")
        self.headers = dict(headers or {})
        self._client = httpx.Client(**_client_kwargs(self.base_url, self.timeout, proxy))

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> FixedFloat:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def _request(
        self,
        endpoint: str,
        payload: dict[str, Any] | None = None,
        *,
        idempotent: bool = True,
    ) -> Any:
        body = _dumps(payload)
        headers = _auth_headers(self.api_key, self.api_secret, body, self.headers)
        attempts = self.retries + 1 if idempotent else 1
        last_error: FixedFloatError | None = None

        for attempt in range(attempts):
            try:
                response = self._client.post(endpoint, content=body, headers=headers)
                return decode_response(response.status_code, response.text)
            except httpx.TimeoutException as exc:
                last_error = FixedFloatTimeoutError(str(exc) or "Request timed out")
            except httpx.HTTPError as exc:
                last_error = FixedFloatNetworkError(f"HTTP request failed: {exc}")
            except FixedFloatError as exc:
                last_error = exc

            if last_error is None or not last_error.retryable or attempt >= attempts - 1:
                assert last_error is not None
                raise last_error
            delay = self.retry_delay * (2**attempt)
            if delay > 0:
                time.sleep(delay)

        raise last_error or FixedFloatError("Request failed")  # pragma: no cover

    def _request_text(self, url: str) -> str:
        attempts = self.retries + 1
        last_error: FixedFloatError | None = None
        for attempt in range(attempts):
            try:
                response = self._client.get(
                    url,
                    headers={"Accept": "application/xml, text/xml, */*"},
                )
                if response.status_code >= 400:
                    raise _error_for_status(
                        response.status_code, response.text, f"HTTP {response.status_code}"
                    )
                return response.text
            except httpx.TimeoutException as exc:
                last_error = FixedFloatTimeoutError(str(exc) or "Request timed out")
            except httpx.HTTPError as exc:
                last_error = FixedFloatNetworkError(f"HTTP request failed: {exc}")
            except FixedFloatError as exc:
                last_error = exc

            if last_error is None or not last_error.retryable or attempt >= attempts - 1:
                assert last_error is not None
                raise last_error
            delay = self.retry_delay * (2**attempt)
            if delay > 0:
                time.sleep(delay)
        raise last_error or FixedFloatError("Request failed")  # pragma: no cover

    def get_currencies(self) -> list[Currency]:
        """Retrieve the list of available cryptocurrencies and networks."""
        return parse_currencies(self._request("/ccies", {}))

    def ccies(self) -> list[Currency]:
        """Alias of :meth:`get_currencies`. Matches the official PHP method name."""
        return self.get_currencies()

    def get_price(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        afftax: float | None = None,
        ccies: bool | None = None,
        usd: bool | None = None,
    ) -> PriceResult:
        """Calculate an exchange quote for a currency pair.

        Args:
            from_ccy: Source cryptocurrency code (e.g. ``BTC``).
            to_ccy: Destination cryptocurrency code (e.g. ``ETH``).
            amount: Exchange amount.
            direction: ``from`` (send this amount) or ``to`` (receive this amount).
            order_type: ``fixed`` or ``float``.
            afftax: Optional affiliate tax percentage. The library refcode is always sent.
            ccies: When true, include send/receive availability for every currency.
            usd: When true, out-of-limit amounts are adjusted using the USD equivalent.
        """
        payload = price_payload(from_ccy, to_ccy, amount, direction, order_type, afftax, ccies, usd)
        return parse_price(self._request("/price", payload))

    def price(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        afftax: float | None = None,
        ccies: bool | None = None,
        usd: bool | None = None,
    ) -> PriceResult:
        """Alias of :meth:`get_price`."""
        return self.get_price(from_ccy, to_ccy, amount, direction, order_type, afftax, ccies, usd)

    def get_price_shorthand(
        self,
        from_expr: str,
        to_expr: str,
        order_type: OrderType = "float",
    ) -> PriceResult:
        """Quote using ``'0.1 ETH', 'BTC'`` or ``'ETH', '0.1 BTC'`` strings."""
        parsed = parse_price_shorthand(from_expr, to_expr, order_type)
        return self.get_price(
            parsed["from_ccy"],
            parsed["to_ccy"],
            parsed["amount"],
            parsed["direction"],
            parsed["order_type"],
        )

    def get_price_or_raise(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        afftax: float | None = None,
        ccies: bool | None = None,
        usd: bool | None = None,
    ) -> PriceResult:
        """Same as :meth:`get_price`, then raise when ``errors`` is not empty."""
        quote = self.get_price(from_ccy, to_ccy, amount, direction, order_type, afftax, ccies, usd)
        assert_quote_ok(quote)
        return quote

    def create_order(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        to_address: str,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        afftax: float | None = None,
        tag: str | None = None,
    ) -> Order:
        """Create a new exchange order.

        This call costs 50 rate-limit weight units and is not retried.
        ``tag`` is the official memo field. ``extra_id`` is a legacy alias and is
        also sent as ``extraId`` when provided.
        """
        payload = create_payload(
            from_ccy,
            to_ccy,
            amount,
            to_address,
            direction,
            order_type,
            extra_id,
            refund_address,
            refund_extra_id,
            afftax,
            tag,
        )
        return parse_order(self._request("/create", payload, idempotent=False))

    def create(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        to_address: str,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        afftax: float | None = None,
        tag: str | None = None,
    ) -> Order:
        """Alias of :meth:`create_order`."""
        return self.create_order(
            from_ccy,
            to_ccy,
            amount,
            to_address,
            direction,
            order_type,
            extra_id,
            refund_address,
            refund_extra_id,
            afftax,
            tag,
        )

    def get_order(self, id: str, token: str) -> Order:
        """Retrieve the status and details of an exchange order."""
        return parse_order(self._request("/order", {"id": id, "token": token}))

    def order(self, id: str, token: str) -> Order:
        """Alias of :meth:`get_order`."""
        return self.get_order(id, token)

    def status_text(self, status: str) -> str:
        """Human-readable label for an order status."""
        return order_status_text(status)

    def wait_for_order(
        self,
        id: str,
        token: str,
        statuses: list[str] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        should_stop: Callable[[], bool] | None = None,
    ) -> Order:
        """Poll :meth:`get_order` until the status matches, or the timeout elapses.

        The default statuses are DONE, EXPIRED and EMERGENCY. EMERGENCY is included
        so the caller can submit a choice and wait again.
        """
        targets = list(statuses) if statuses is not None else list(TERMINAL_ORDER_STATUSES)
        deadline = time.monotonic() + (DEFAULT_WAIT_TIMEOUT if timeout is None else timeout)
        pause = DEFAULT_WAIT_INTERVAL if interval is None else interval
        while True:
            if should_stop and should_stop():
                raise FixedFloatError("The order wait was aborted")
            current = self.get_order(id, token)
            if current.status in targets:
                return current
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise FixedFloatTimeoutError(
                    f"Order {id} was still {current.status} after the wait timeout",
                    retryable=False,
                )
            time.sleep(min(pause, remaining))

    def set_emergency(
        self,
        id: str,
        token: str,
        choice: EmergencyChoice,
        address: str | None = None,
        extra_id: str | None = None,
        tag: str | None = None,
    ) -> Any:
        """Set emergency resolution (``EXCHANGE`` or ``REFUND``).

        ``REFUND`` requires ``address``. ``tag`` is the official memo field.
        ``extra_id`` remains accepted and is sent as ``tag`` and ``extraId``.
        """
        payload = emergency_payload(id, token, choice, address, extra_id, tag)
        return self._request("/emergency", payload)

    def emergency(
        self,
        id: str,
        token: str,
        choice: EmergencyChoice,
        address: str | None = None,
        extra_id: str | None = None,
        tag: str | None = None,
    ) -> Any:
        """Alias of :meth:`set_emergency`."""
        return self.set_emergency(id, token, choice, address, extra_id, tag)

    def set_email(self, id: str, token: str, email: str) -> Any:
        """Subscribe an email address to status notifications for an order."""
        return self._request("/setEmail", {"id": id, "token": token, "email": email})

    def set_email_notification(self, id: str, token: str, email: str) -> Any:
        """Alias of :meth:`set_email`."""
        return self.set_email(id, token, email)

    def subscribe(self, id: str, token: str, email: str) -> Any:
        """Alias of :meth:`set_email`."""
        return self.set_email(id, token, email)

    def get_qr(self, id: str, token: str) -> QrResult:
        """QR codes for the deposit address. ``src`` is the default image."""
        return parse_qr(self._request("/qr", {"id": id, "token": token}))

    def qr(self, id: str, token: str) -> QrResult:
        """Alias of :meth:`get_qr`."""
        return self.get_qr(id, token)

    def get_qr_codes(self, id: str, token: str) -> list[QrCode]:
        """Full QR list (``title``, ``src``, ``checked``)."""
        return self.get_qr(id, token).codes

    def get_rates_xml(self, order_type: OrderType = "float") -> str:
        """Download the public XML rates export. No API key is required."""
        if order_type not in ("fixed", "float"):
            raise FixedFloatError(f"Unknown rates type: {order_type}")
        return self._request_text(f"{self.rates_base_url}/rates/{order_type}.xml")

    def get_rates(
        self,
        order_type: OrderType = "float",
        from_ccy: str | None = None,
        to_ccy: str | None = None,
    ) -> list[RateItem]:
        """Parsed rows from the XML rates export, optionally filtered to one pair."""
        return filter_rates(parse_rates_xml(self.get_rates_xml(order_type)), from_ccy, to_ccy)

    def raw_request(
        self,
        endpoint: str,
        payload: dict[str, Any] | None = None,
        *,
        idempotent: bool | None = None,
    ) -> Any:
        """Signed POST to any ``/api/v2`` path. Returns the envelope ``data`` field.

        Paths other than ``/create`` are retried on transient failures unless
        ``idempotent`` is false.
        """
        path = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        safe = (path != "/create") if idempotent is None else idempotent
        return self._request(path, payload or {}, idempotent=safe)


class AsyncFixedFloat:
    """Async client with the same methods as :class:`FixedFloat`.

    Use it inside ``async with`` so the HTTP connection pool is closed.
    """

    def __init__(
        self,
        api_key: str | None = None,
        api_secret: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        proxy: str | None = None,
        retries: int = DEFAULT_RETRIES,
        retry_delay: float = DEFAULT_RETRY_DELAY,
        rates_base_url: str = DEFAULT_RATES_BASE_URL,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.proxy = proxy
        self.retries = max(0, retries)
        self.retry_delay = max(0.0, retry_delay)
        self.rates_base_url = rates_base_url.rstrip("/")
        self.headers = dict(headers or {})
        self._client = httpx.AsyncClient(**_client_kwargs(self.base_url, self.timeout, proxy))

    async def aclose(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> AsyncFixedFloat:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.aclose()

    async def _request(
        self,
        endpoint: str,
        payload: dict[str, Any] | None = None,
        *,
        idempotent: bool = True,
    ) -> Any:
        body = _dumps(payload)
        headers = _auth_headers(self.api_key, self.api_secret, body, self.headers)
        attempts = self.retries + 1 if idempotent else 1
        last_error: FixedFloatError | None = None

        for attempt in range(attempts):
            try:
                response = await self._client.post(endpoint, content=body, headers=headers)
                return decode_response(response.status_code, response.text)
            except httpx.TimeoutException as exc:
                last_error = FixedFloatTimeoutError(str(exc) or "Request timed out")
            except httpx.HTTPError as exc:
                last_error = FixedFloatNetworkError(f"HTTP request failed: {exc}")
            except FixedFloatError as exc:
                last_error = exc

            if last_error is None or not last_error.retryable or attempt >= attempts - 1:
                assert last_error is not None
                raise last_error
            delay = self.retry_delay * (2**attempt)
            if delay > 0:
                await asyncio.sleep(delay)

        raise last_error or FixedFloatError("Request failed")  # pragma: no cover

    async def _request_text(self, url: str) -> str:
        attempts = self.retries + 1
        last_error: FixedFloatError | None = None
        for attempt in range(attempts):
            try:
                response = await self._client.get(
                    url,
                    headers={"Accept": "application/xml, text/xml, */*"},
                )
                if response.status_code >= 400:
                    raise _error_for_status(
                        response.status_code, response.text, f"HTTP {response.status_code}"
                    )
                return response.text
            except httpx.TimeoutException as exc:
                last_error = FixedFloatTimeoutError(str(exc) or "Request timed out")
            except httpx.HTTPError as exc:
                last_error = FixedFloatNetworkError(f"HTTP request failed: {exc}")
            except FixedFloatError as exc:
                last_error = exc

            if last_error is None or not last_error.retryable or attempt >= attempts - 1:
                assert last_error is not None
                raise last_error
            delay = self.retry_delay * (2**attempt)
            if delay > 0:
                await asyncio.sleep(delay)
        raise last_error or FixedFloatError("Request failed")  # pragma: no cover

    async def get_currencies(self) -> list[Currency]:
        """Retrieve the list of available cryptocurrencies and networks."""
        return parse_currencies(await self._request("/ccies", {}))

    async def ccies(self) -> list[Currency]:
        """Alias of :meth:`get_currencies`."""
        return await self.get_currencies()

    async def get_price(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        afftax: float | None = None,
        ccies: bool | None = None,
        usd: bool | None = None,
    ) -> PriceResult:
        """Calculate an exchange quote for a currency pair."""
        payload = price_payload(from_ccy, to_ccy, amount, direction, order_type, afftax, ccies, usd)
        return parse_price(await self._request("/price", payload))

    async def price(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        afftax: float | None = None,
        ccies: bool | None = None,
        usd: bool | None = None,
    ) -> PriceResult:
        """Alias of :meth:`get_price`."""
        return await self.get_price(
            from_ccy, to_ccy, amount, direction, order_type, afftax, ccies, usd
        )

    async def get_price_shorthand(
        self,
        from_expr: str,
        to_expr: str,
        order_type: OrderType = "float",
    ) -> PriceResult:
        """Quote using ``'0.1 ETH', 'BTC'`` or ``'ETH', '0.1 BTC'`` strings."""
        parsed = parse_price_shorthand(from_expr, to_expr, order_type)
        return await self.get_price(
            parsed["from_ccy"],
            parsed["to_ccy"],
            parsed["amount"],
            parsed["direction"],
            parsed["order_type"],
        )

    async def get_price_or_raise(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        afftax: float | None = None,
        ccies: bool | None = None,
        usd: bool | None = None,
    ) -> PriceResult:
        """Same as :meth:`get_price`, then raise when ``errors`` is not empty."""
        quote = await self.get_price(
            from_ccy, to_ccy, amount, direction, order_type, afftax, ccies, usd
        )
        assert_quote_ok(quote)
        return quote

    async def create_order(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        to_address: str,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        afftax: float | None = None,
        tag: str | None = None,
    ) -> Order:
        """Create a new exchange order. Not retried."""
        payload = create_payload(
            from_ccy,
            to_ccy,
            amount,
            to_address,
            direction,
            order_type,
            extra_id,
            refund_address,
            refund_extra_id,
            afftax,
            tag,
        )
        return parse_order(await self._request("/create", payload, idempotent=False))

    async def create(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        to_address: str,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        afftax: float | None = None,
        tag: str | None = None,
    ) -> Order:
        """Alias of :meth:`create_order`."""
        return await self.create_order(
            from_ccy,
            to_ccy,
            amount,
            to_address,
            direction,
            order_type,
            extra_id,
            refund_address,
            refund_extra_id,
            afftax,
            tag,
        )

    async def get_order(self, id: str, token: str) -> Order:
        """Retrieve the status and details of an exchange order."""
        return parse_order(await self._request("/order", {"id": id, "token": token}))

    async def order(self, id: str, token: str) -> Order:
        """Alias of :meth:`get_order`."""
        return await self.get_order(id, token)

    def status_text(self, status: str) -> str:
        """Human-readable label for an order status."""
        return order_status_text(status)

    async def wait_for_order(
        self,
        id: str,
        token: str,
        statuses: list[str] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        should_stop: Callable[[], bool] | None = None,
    ) -> Order:
        """Poll :meth:`get_order` until the status matches, or the timeout elapses."""
        targets = list(statuses) if statuses is not None else list(TERMINAL_ORDER_STATUSES)
        deadline = time.monotonic() + (DEFAULT_WAIT_TIMEOUT if timeout is None else timeout)
        pause = DEFAULT_WAIT_INTERVAL if interval is None else interval
        while True:
            if should_stop and should_stop():
                raise FixedFloatError("The order wait was aborted")
            current = await self.get_order(id, token)
            if current.status in targets:
                return current
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise FixedFloatTimeoutError(
                    f"Order {id} was still {current.status} after the wait timeout",
                    retryable=False,
                )
            await asyncio.sleep(min(pause, remaining))

    async def set_emergency(
        self,
        id: str,
        token: str,
        choice: EmergencyChoice,
        address: str | None = None,
        extra_id: str | None = None,
        tag: str | None = None,
    ) -> Any:
        """Set emergency resolution (``EXCHANGE`` or ``REFUND``)."""
        payload = emergency_payload(id, token, choice, address, extra_id, tag)
        return await self._request("/emergency", payload)

    async def emergency(
        self,
        id: str,
        token: str,
        choice: EmergencyChoice,
        address: str | None = None,
        extra_id: str | None = None,
        tag: str | None = None,
    ) -> Any:
        """Alias of :meth:`set_emergency`."""
        return await self.set_emergency(id, token, choice, address, extra_id, tag)

    async def set_email(self, id: str, token: str, email: str) -> Any:
        """Subscribe an email address to status notifications for an order."""
        return await self._request("/setEmail", {"id": id, "token": token, "email": email})

    async def set_email_notification(self, id: str, token: str, email: str) -> Any:
        """Alias of :meth:`set_email`."""
        return await self.set_email(id, token, email)

    async def subscribe(self, id: str, token: str, email: str) -> Any:
        """Alias of :meth:`set_email`."""
        return await self.set_email(id, token, email)

    async def get_qr(self, id: str, token: str) -> QrResult:
        """QR codes for the deposit address. ``src`` is the default image."""
        return parse_qr(await self._request("/qr", {"id": id, "token": token}))

    async def qr(self, id: str, token: str) -> QrResult:
        """Alias of :meth:`get_qr`."""
        return await self.get_qr(id, token)

    async def get_qr_codes(self, id: str, token: str) -> list[QrCode]:
        """Full QR list (``title``, ``src``, ``checked``)."""
        result = await self.get_qr(id, token)
        return result.codes

    async def get_rates_xml(self, order_type: OrderType = "float") -> str:
        """Download the public XML rates export. No API key is required."""
        if order_type not in ("fixed", "float"):
            raise FixedFloatError(f"Unknown rates type: {order_type}")
        return await self._request_text(f"{self.rates_base_url}/rates/{order_type}.xml")

    async def get_rates(
        self,
        order_type: OrderType = "float",
        from_ccy: str | None = None,
        to_ccy: str | None = None,
    ) -> list[RateItem]:
        """Parsed rows from the XML rates export, optionally filtered to one pair."""
        xml = await self.get_rates_xml(order_type)
        return filter_rates(parse_rates_xml(xml), from_ccy, to_ccy)

    async def raw_request(
        self,
        endpoint: str,
        payload: dict[str, Any] | None = None,
        *,
        idempotent: bool | None = None,
    ) -> Any:
        """Signed POST to any ``/api/v2`` path. Returns the envelope ``data`` field."""
        path = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        safe = (path != "/create") if idempotent is None else idempotent
        return await self._request(path, payload or {}, idempotent=safe)
