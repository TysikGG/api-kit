"""Synchronous and asynchronous clients for the BitcoinVN exchange API."""

from __future__ import annotations

import math
import time
from collections.abc import AsyncIterator, Iterator, Mapping
from functools import wraps
from typing import Any
from urllib.parse import quote, urlencode, urlsplit

import httpx

from bitcoinvn.errors import (
    BitcoinVnError,
    BitcoinVnTimeoutError,
    BitcoinVnTransportError,
    error_class_for_status,
)
from bitcoinvn.types import (
    AddressValidation,
    Balances,
    BooleanConfiguration,
    EnsResolution,
    HealthStatus,
    Info,
    LedgerItem,
    Order,
    Pair,
    Quote,
    Ticker,
    Vault,
)
from bitcoinvn.webhook import read_webhook as read_webhook_payload
from bitcoinvn.webhook import verify_webhook_signature

DEFAULT_BASE_URL = "https://bitcoinvn.io"
USER_AGENT = "bitcoinvn/0.1.0"
REFERRER = "35b2eec68a1741ac"
ORDERS_PAGE_SIZE = 10
LEDGER_PAGE_SIZE = 25
DEFAULT_WAIT_STATUSES = ("completed", "canceled", "settle_data_error")
ORDER_STATUSES = (
    "new",
    "pending",
    "settle_data_error",
    "on_hold",
    "processing",
    "completed",
    "canceled",
)


class _Api:
    """Shared BitcoinVN operations. ``_call`` performs the HTTP request."""

    _api_key: str | None
    _retries: int
    _retry_delay_ms: float
    _max_retry_delay_ms: float
    _retry_mutations: bool
    _extra_headers: dict[str, str]
    _sleep: Any
    _monotonic: Any
    base_url: str
    last_rate_limit: dict[str, int] | None

    def _call(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        body: Mapping[str, Any] | None = None,
        text: bool = False,
        idempotent: bool = False,
    ) -> Any:
        raise NotImplementedError

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        for key, value in self._extra_headers.items():
            if key.lower() in {"x-api-key", "user-agent"}:
                continue
            headers[key] = value
        if self._api_key:
            headers["X-API-KEY"] = self._api_key
        return headers

    def _attempts(self, idempotent: bool) -> int:
        extra = self._retries if idempotent or self._retry_mutations else 0
        return 1 + extra

    def _should_retry(self, error: BitcoinVnError, attempt: int, attempts: int) -> bool:
        if attempt >= attempts - 1:
            return False
        return error.status == 0 or error.status == 429 or error.status >= 500

    def _delay(self, error: BitcoinVnError, attempt: int) -> float:
        delay_ms = self._retry_delay_ms * (2**attempt)
        if error.retry_after is not None:
            delay_ms = max(delay_ms, error.retry_after * 1000)
        if not math.isfinite(delay_ms) or delay_ms < 0:
            delay_ms = 0
        return min(delay_ms, self._max_retry_delay_ms) / 1000

    def _pause(self, seconds: float) -> None:
        if seconds <= 0:
            return
        self._sleep(seconds)

    def _remember(self, response: httpx.Response) -> None:
        snapshot = _rate_limit(response)
        if snapshot is not None:
            self.last_rate_limit = snapshot

    def get_health(self) -> HealthStatus:
        """``GET /api/health``.

        Examples:
            health = client.get_health()
        """
        return self._call("GET", "/api/health", idempotent=True)

    def get_info(self) -> Info:
        """``GET /api/info``.

        Use method ids exactly as returned. Check ``depositEnabled`` or
        ``settleEnabled`` for the direction you need.

        Examples:
            info = client.get_info()
        """
        return self._call("GET", "/api/info", idempotent=True)

    def info(self) -> Info:
        """Alias of :meth:`get_info`."""
        return self.get_info()

    def get_pair(self, deposit_method_id: str, settle_method_id: str) -> Pair:
        """``GET /api/pairs/{depositMethodId}/{settleMethodId}``.

        A successful response does not reserve liquidity. An API key applies
        the account minimum to ``min``.

        Examples:
            pair = client.get_pair("btc", "xmr")
        """
        path = f"/api/pairs/{_segment(deposit_method_id)}/{_segment(settle_method_id)}"
        return self._call("GET", path, idempotent=True)

    def pair(self, deposit_method_id: str, settle_method_id: str) -> Pair:
        """Alias of :meth:`get_pair`."""
        return self.get_pair(deposit_method_id, settle_method_id)

    def get_ticker(self, base_asset_id: str, quote_asset_id: str) -> Ticker:
        """``GET /api/ticker/{baseAssetId}/{quoteAssetId}``.

        Asset ids are case-sensitive. ``rate`` is quote units per one base unit.

        Examples:
            ticker = client.get_ticker("BTC", "USDT")
        """
        path = f"/api/ticker/{_segment(base_asset_id)}/{_segment(quote_asset_id)}"
        return self._call("GET", path, idempotent=True)

    def validate_address(
        self,
        transfer_method: str,
        address: str,
        *,
        invoice_amount: float | None = None,
    ) -> AddressValidation:
        """``GET /api/addresses/validate``.

        For Lightning, pass the BOLT11 invoice as ``address``.

        Examples:
            result = client.validate_address("btc", "bc1qexample")
        """
        return self._call(
            "GET",
            "/api/addresses/validate",
            query={
                "transferMethod": transfer_method,
                "address": address,
                "invoiceAmount": invoice_amount,
            },
            idempotent=True,
        )

    def create_quote(
        self,
        deposit_method: str,
        settle_method: str,
        *,
        deposit_amount: float | None = None,
        settle_amount: float | None = None,
        markup_rate: float | None = None,
    ) -> Quote:
        """``POST /api/quotes``.

        Send ``deposit_amount``, ``settle_amount``, or neither, but not both.
        This creates a production quote and does not move funds.

        Examples:
            quote = client.create_quote("btc", "xmr", deposit_amount=0.01)
        """
        return self._call(
            "POST",
            "/api/quotes",
            body=_omit_none(
                {
                    "depositMethod": deposit_method,
                    "settleMethod": settle_method,
                    "depositAmount": deposit_amount,
                    "settleAmount": settle_amount,
                    "markupRate": markup_rate,
                }
            ),
        )

    def quote(
        self,
        deposit_method: str,
        settle_method: str,
        deposit_amount: float | None = None,
        settle_amount: float | None = None,
        *,
        markup_rate: float | None = None,
    ) -> Quote:
        """Alias of :meth:`create_quote`. Positional amounts match the PHP SDK."""
        return self.create_quote(
            deposit_method,
            settle_method,
            deposit_amount=deposit_amount,
            settle_amount=settle_amount,
            markup_rate=markup_rate,
        )

    def list_orders(
        self,
        *,
        page: int | None = None,
        custom_order_id: str | None = None,
    ) -> list[Order]:
        """``GET /api/orders``. Requires ``X-API-KEY``. Pages contain 10 orders.

        Examples:
            orders = client.list_orders(page=1)
        """
        return self._call(
            "GET",
            "/api/orders",
            query={"page": page, "customOrderId": custom_order_id},
            idempotent=True,
        )

    def orders(
        self,
        *,
        page: int | None = None,
        custom_order_id: str | None = None,
    ) -> list[Order]:
        """Alias of :meth:`list_orders`."""
        return self.list_orders(page=page, custom_order_id=custom_order_id)

    def create_order(
        self,
        *,
        quote: str | None = None,
        deposit_method: str | None = None,
        settle_method: str | None = None,
        deposit_amount: float | None = None,
        settle_amount: float | None = None,
        custom_order_id: str | None = None,
        webhook_url: str | None = None,
        settle_data: Mapping[str, Any] | None = None,
    ) -> Order:
        """``POST /api/orders``. Creates a production order.

        Pass ``quote``, or ``deposit_method`` and ``settle_method`` for a
        variable-amount order. An amountless internal-balance quote can also
        take ``deposit_amount`` or ``settle_amount``. The JSON body always
        includes ``referrer``. Funding the order moves real funds.

        Examples:
            order = client.create_order(
                quote="8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
                settle_data={"address": "4example"},
            )
        """
        body = _omit_none(
            {
                "quote": quote,
                "depositMethod": deposit_method,
                "settleMethod": settle_method,
                "depositAmount": deposit_amount,
                "settleAmount": settle_amount,
                "customOrderId": custom_order_id,
                "webhookUrl": webhook_url,
                "settleData": dict(settle_data) if settle_data is not None else None,
            }
        )
        body["referrer"] = REFERRER
        return self._call("POST", "/api/orders", body=body)

    def fixed_swap(
        self,
        quote_id: str,
        destination: str | Mapping[str, Any] | None = None,
        *,
        webhook_url: str | None = None,
        custom_order_id: str | None = None,
    ) -> Order:
        """Create an order from a quote id.

        A string destination is sent as ``{"address": destination}``.
        Omit it to credit an internal balance. ``referrer`` is always sent.
        """
        return self.create_order(
            quote=quote_id,
            settle_data=_destination(destination),
            webhook_url=webhook_url,
            custom_order_id=custom_order_id,
        )

    def variable_swap(
        self,
        deposit_method: str,
        settle_method: str,
        destination: str | Mapping[str, Any] | None = None,
        *,
        webhook_url: str | None = None,
        custom_order_id: str | None = None,
    ) -> Order:
        """Create a variable-amount order from method ids.

        A string destination is sent as ``{"address": destination}``.
        ``referrer`` is always sent.
        """
        return self.create_order(
            deposit_method=deposit_method,
            settle_method=settle_method,
            settle_data=_destination(destination),
            webhook_url=webhook_url,
            custom_order_id=custom_order_id,
        )

    def get_order(self, order_id: str) -> Order:
        """``GET /api/orders/{id}``. ``order_id`` is the 8-character short id.

        Examples:
            order = client.get_order("BV2MTZAF")
        """
        return self._call("GET", f"/api/orders/{_segment(order_id)}", idempotent=True)

    def order(self, order_id: str) -> Order:
        """Alias of :meth:`get_order`."""
        return self.get_order(order_id)

    def submit_deposit(self, order_id: str, txid: str) -> Order:
        """``POST /api/orders/{id}/deposit``.

        Optional fast path after a supported on-chain deposit is broadcast and
        the order is ``new``. Fiat, Lightning, internal-balance, and manual
        deposits do not use this call.

        Examples:
            order = client.submit_deposit("BV2MTZAF", "0x0123456789abcdef")
        """
        return self._call(
            "POST",
            f"/api/orders/{_segment(order_id)}/deposit",
            body={"txid": txid},
        )

    def update_settle_data(self, order_id: str, settle_data: Mapping[str, Any]) -> Order:
        """``PUT /api/orders/{id}/settle-data``.

        Requires a key with write access. The order must be ``settle_data_error``.

        Examples:
            order = client.update_settle_data("BV2MTZAF", {"address": "bc1qexample"})
        """
        return self._call(
            "PUT",
            f"/api/orders/{_segment(order_id)}/settle-data",
            body=dict(settle_data),
        )

    def get_balances(self) -> Balances:
        """``GET /api/balances``. Requires ``X-API-KEY``.

        Examples:
            balances = client.get_balances()
        """
        return self._call("GET", "/api/balances", idempotent=True)

    def balances(self) -> Balances:
        """Alias of :meth:`get_balances`."""
        return self.get_balances()

    def list_balance_history(
        self,
        *,
        asset_id: str | None = None,
        page: int | None = None,
    ) -> list[LedgerItem]:
        """``GET /api/balances/history``. Requires ``X-API-KEY``.

        Pages contain 25 rows.

        Examples:
            history = client.list_balance_history(asset_id="BTC", page=1)
        """
        return self._call(
            "GET",
            "/api/balances/history",
            query={"assetId": asset_id, "page": page},
            idempotent=True,
        )

    def list_staking_offers(self) -> list[Vault]:
        """``GET /api/staking``.

        Examples:
            offers = client.list_staking_offers()
        """
        return self._call("GET", "/api/staking", idempotent=True)

    def set_auto_stake(self, offer_id: str, value: bool) -> BooleanConfiguration:
        """``PUT /api/staking/{id}/auto-stake``. Requires write access.

        Examples:
            setting = client.set_auto_stake("8120a8a8-8dd1-4168-80fc-c4d932ce5b93", True)
        """
        return self._call(
            "PUT",
            f"/api/staking/{_segment(offer_id)}/auto-stake",
            body={"value": value},
        )

    def set_staking_notifications(self, offer_id: str, value: bool) -> BooleanConfiguration:
        """``PUT /api/staking/{id}/notifications``. Requires write access.

        Examples:
            setting = client.set_staking_notifications(
                "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
                False,
            )
        """
        return self._call(
            "PUT",
            f"/api/staking/{_segment(offer_id)}/notifications",
            body={"value": value},
        )

    def resolve_address(self, transfer_method: str, name: str) -> EnsResolution:
        """``GET /api/addresses/resolve``.

        Resolves an ASCII ENS name. The token expires after 15 minutes.

        Examples:
            resolved = client.resolve_address("eth", "alice.eth")
        """
        return self._call(
            "GET",
            "/api/addresses/resolve",
            query={"transferMethod": transfer_method, "name": name},
            idempotent=True,
        )

    def get_guarantee_public_key(self) -> str:
        """``GET /api/guarantee/public-key``.

        Returns armored OpenPGP certificates.

        Examples:
            certificates = client.get_guarantee_public_key()
        """
        return self._call("GET", "/api/guarantee/public-key", text=True, idempotent=True)

    def get_order_guarantee(self, order_id: str) -> str:
        """``GET /api/orders/{id}/guarantee``.

        Returns the stored clear-signed letter. Access matches ``get_order``.

        Examples:
            letter = client.get_order_guarantee("BV2MTZAF")
        """
        return self._call(
            "GET",
            f"/api/orders/{_segment(order_id)}/guarantee",
            text=True,
            idempotent=True,
        )

    def swap_url(self, deposit: str | None = None, settle: str | None = None) -> str:
        """HTML swap form URL. A link does not reserve a quote.

        Examples:
            client.swap_url("btc", "xmr")
        """
        parts = urlsplit(self.base_url)
        origin = f"{parts.scheme}://{parts.netloc}"
        query: dict[str, str] = {}
        if deposit:
            query["deposit"] = deposit
        if settle:
            query["settle"] = settle
        if not query:
            return f"{origin}/"
        return f"{origin}/?{urlencode(query)}"

    def verify_webhook(self, raw_body: bytes | str, signature: str | None) -> bool:
        """Verify ``X-Signature`` with this client's API key.

        Returns ``False`` when no key was configured.
        """
        if not self._api_key:
            return False
        return verify_webhook_signature(raw_body, signature, self._api_key)

    def read_webhook(
        self,
        raw_body: bytes | str,
        signature: str | None = None,
        *,
        require_signature: bool = False,
    ) -> tuple[dict[str, Any], bool]:
        """Parse an order webhook using this client's API key."""
        return read_webhook_payload(
            raw_body,
            signature,
            self._api_key,
            require_signature=require_signature,
        )


def _configure(
    target: _Api,
    api_key: str | None,
    *,
    base_url: str | None,
    retries: int,
    retry_delay_ms: float,
    max_retry_delay_ms: float,
    retry_mutations: bool,
    headers: Mapping[str, str] | None,
    sleep: Any,
    monotonic: Any,
) -> None:
    key = api_key.strip() if isinstance(api_key, str) else ""
    target._api_key = key or None
    target.base_url = _normalize_base_url(base_url)
    target._retries = max(0, int(retries))
    target._retry_delay_ms = max(0.0, float(retry_delay_ms))
    target._max_retry_delay_ms = max(0.0, float(max_retry_delay_ms))
    target._retry_mutations = retry_mutations
    target._extra_headers = dict(headers or {})
    target._sleep = sleep
    target._monotonic = monotonic or time.monotonic
    target.last_rate_limit = None


class BitcoinVn(_Api):
    """Client for the BitcoinVN exchange API.

    Public reads, quotes, and order creation do not need a key. Pass ``api_key``
    to send ``X-API-KEY``. The key is created on the API keys page at
    bitcoinvn.io. This client does not manage keys.

    ``create_order`` always sends the JSON property ``referrer``. Callers cannot
    pass or disable it. Other methods do not send that field.

    Examples:
        client = BitcoinVn()
        ticker = client.get_ticker("BTC", "USDT")
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout_ms: float | None = None,
        client: httpx.Client | None = None,
        proxy: str | None = None,
        retries: int = 0,
        retry_delay_ms: float = 200,
        max_retry_delay_ms: float = 5_000,
        retry_mutations: bool = False,
        headers: Mapping[str, str] | None = None,
        sleep: Any = None,
        monotonic: Any = None,
    ) -> None:
        """Create a client.

        Args:
            api_key: Key sent as ``X-API-KEY``. A blank value sends no header.
            base_url: Defaults to ``https://bitcoinvn.io``.
            timeout_ms: Request timeout in milliseconds. Defaults to 30000.
            client: Optional ``httpx.Client``. When set, this object does not
                close it and ignores ``base_url``, ``timeout_ms``, and ``proxy``.
            proxy: HTTP or HTTPS proxy URL used by the built-in client.
            retries: Extra attempts for GET requests after a transport error,
                HTTP 429, or HTTP 5xx. POST and PUT are not retried unless
                ``retry_mutations`` is true.
            retry_delay_ms: Base delay before a retry. It doubles each attempt.
            max_retry_delay_ms: Upper bound for a retry delay, including ``Retry-After``.
            retry_mutations: When true, POST and PUT use ``retries`` as well.
            headers: Extra headers. ``X-API-KEY`` and ``User-Agent`` stay owned
                by the client.
            sleep: Called with seconds before a retry or the next poll.
            monotonic: Clock used by ``wait_for_order``. Defaults to ``time.monotonic``.

        Examples:
            client = BitcoinVn(api_key)
        """
        _configure(
            self,
            api_key,
            base_url=base_url,
            retries=retries,
            retry_delay_ms=retry_delay_ms,
            max_retry_delay_ms=max_retry_delay_ms,
            retry_mutations=retry_mutations,
            headers=headers,
            sleep=sleep or time.sleep,
            monotonic=monotonic,
        )
        self._owns_client = client is None
        if client is not None:
            self._http = client
            return
        kwargs: dict[str, Any] = {}
        if proxy:
            kwargs["proxy"] = _validate_proxy(proxy)
        self._http = httpx.Client(
            base_url=self.base_url,
            timeout=_timeout_seconds(timeout_ms),
            headers={
                "Accept": "application/json, text/plain",
                "User-Agent": USER_AGENT,
            },
            **kwargs,
        )

    def close(self) -> None:
        """Close the HTTP client when this object created it.

        Examples:
            client.close()
        """
        if self._owns_client:
            self._http.close()

    def __enter__(self) -> BitcoinVn:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def _call(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        body: Mapping[str, Any] | None = None,
        text: bool = False,
        idempotent: bool = False,
    ) -> Any:
        attempts = self._attempts(idempotent)
        params = _query(query)
        payload = dict(body) if body is not None else None
        headers = self._headers() or None
        last_error: BitcoinVnError | None = None
        for attempt in range(attempts):
            try:
                response = self._http.request(
                    method,
                    path,
                    params=params,
                    json=payload,
                    headers=headers,
                )
            except httpx.HTTPError as exc:
                last_error = BitcoinVnTransportError(str(exc), status=0, code=0, raw=str(exc))
                if self._should_retry(last_error, attempt, attempts):
                    self._pause(self._delay(last_error, attempt))
                    continue
                raise last_error from exc
            self._remember(response)
            try:
                return _decode(response, text=text)
            except BitcoinVnError as exc:
                last_error = exc
                if self._should_retry(exc, attempt, attempts):
                    self._pause(self._delay(exc, attempt))
                    continue
                raise
        raise last_error or BitcoinVnTransportError("Request failed", status=0, code=0)

    def wait_for_order(
        self,
        order_id: str,
        *,
        timeout_ms: float = 120_000,
        interval_ms: float = 3_000,
        statuses: tuple[str, ...] | list[str] | set[str] | None = None,
    ) -> Order:
        """Poll ``get_order`` until ``status`` is requested, or the timeout elapses.

        The default stop statuses are ``completed``, ``canceled``, and
        ``settle_data_error``. A timeout raises :class:`BitcoinVnTimeoutError`
        and includes the last order.
        """
        wanted = set(statuses or DEFAULT_WAIT_STATUSES)
        timeout_ms = max(0.0, float(timeout_ms))
        interval_ms = max(0.0, float(interval_ms))
        deadline = self._monotonic() + timeout_ms / 1000
        while True:
            order = self.get_order(order_id)
            status = order.get("status")
            if status in wanted:
                return order
            if self._monotonic() >= deadline:
                raise BitcoinVnTimeoutError(
                    f"Order {order_id} was still {status} after {_ms(timeout_ms)} ms",
                    order=order,
                )
            remaining = deadline - self._monotonic()
            self._pause(min(interval_ms / 1000, max(remaining, 0)))

    def iter_orders(
        self,
        *,
        custom_order_id: str | None = None,
        max_pages: int = 100,
    ) -> Iterator[Order]:
        """Yield orders, following ``page`` until a short page or ``max_pages``."""
        for page in range(1, max_pages + 1):
            batch = self.list_orders(page=page, custom_order_id=custom_order_id)
            yield from batch
            if len(batch) < ORDERS_PAGE_SIZE:
                return

    def list_all_orders(
        self,
        *,
        custom_order_id: str | None = None,
        max_pages: int = 100,
    ) -> list[Order]:
        """Collect :meth:`iter_orders` into a list."""
        return list(self.iter_orders(custom_order_id=custom_order_id, max_pages=max_pages))

    def iter_balance_history(
        self,
        *,
        asset_id: str | None = None,
        max_pages: int = 100,
    ) -> Iterator[LedgerItem]:
        """Yield ledger rows until a short page or ``max_pages``."""
        for page in range(1, max_pages + 1):
            batch = self.list_balance_history(asset_id=asset_id, page=page)
            yield from batch
            if len(batch) < LEDGER_PAGE_SIZE:
                return

    def list_all_balance_history(
        self,
        *,
        asset_id: str | None = None,
        max_pages: int = 100,
    ) -> list[LedgerItem]:
        """Collect :meth:`iter_balance_history` into a list."""
        return list(self.iter_balance_history(asset_id=asset_id, max_pages=max_pages))


class AsyncBitcoinVn(_Api):
    """Async client for the BitcoinVN exchange API.

    Methods that perform HTTP return awaitables. ``swap_url``, ``verify_webhook``,
    and ``read_webhook`` are synchronous. Use ``async with`` so the underlying
    connection closes.

    Examples:
        async with AsyncBitcoinVn() as client:
            ticker = await client.get_ticker("BTC", "USDT")
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout_ms: float | None = None,
        client: httpx.AsyncClient | None = None,
        proxy: str | None = None,
        retries: int = 0,
        retry_delay_ms: float = 200,
        max_retry_delay_ms: float = 5_000,
        retry_mutations: bool = False,
        headers: Mapping[str, str] | None = None,
        sleep: Any = None,
        monotonic: Any = None,
    ) -> None:
        """Create an async client. Arguments match :class:`BitcoinVn`.

        ``client`` is an ``httpx.AsyncClient``. This object closes it only when
        it created the client. ``sleep`` may be synchronous or asynchronous.
        """
        import asyncio

        _configure(
            self,
            api_key,
            base_url=base_url,
            retries=retries,
            retry_delay_ms=retry_delay_ms,
            max_retry_delay_ms=max_retry_delay_ms,
            retry_mutations=retry_mutations,
            headers=headers,
            sleep=sleep or asyncio.sleep,
            monotonic=monotonic,
        )
        self._owns_client = client is None
        if client is not None:
            self._http = client
            return
        kwargs: dict[str, Any] = {}
        if proxy:
            kwargs["proxy"] = _validate_proxy(proxy)
        self._http = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=_timeout_seconds(timeout_ms),
            headers={
                "Accept": "application/json, text/plain",
                "User-Agent": USER_AGENT,
            },
            **kwargs,
        )

    async def aclose(self) -> None:
        """Close the HTTP client when this object created it."""
        if self._owns_client:
            await self._http.aclose()

    async def __aenter__(self) -> AsyncBitcoinVn:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def _pause(self, seconds: float) -> None:  # type: ignore[override]
        if seconds <= 0:
            return
        result = self._sleep(seconds)
        if hasattr(result, "__await__"):
            await result

    async def _call(  # type: ignore[override]
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        body: Mapping[str, Any] | None = None,
        text: bool = False,
        idempotent: bool = False,
    ) -> Any:
        attempts = self._attempts(idempotent)
        params = _query(query)
        payload = dict(body) if body is not None else None
        headers = self._headers() or None
        last_error: BitcoinVnError | None = None
        for attempt in range(attempts):
            try:
                response = await self._http.request(
                    method,
                    path,
                    params=params,
                    json=payload,
                    headers=headers,
                )
            except httpx.HTTPError as exc:
                last_error = BitcoinVnTransportError(str(exc), status=0, code=0, raw=str(exc))
                if self._should_retry(last_error, attempt, attempts):
                    await self._pause(self._delay(last_error, attempt))
                    continue
                raise last_error from exc
            self._remember(response)
            try:
                return _decode(response, text=text)
            except BitcoinVnError as exc:
                last_error = exc
                if self._should_retry(exc, attempt, attempts):
                    await self._pause(self._delay(exc, attempt))
                    continue
                raise
        raise last_error or BitcoinVnTransportError("Request failed", status=0, code=0)

    async def wait_for_order(
        self,
        order_id: str,
        *,
        timeout_ms: float = 120_000,
        interval_ms: float = 3_000,
        statuses: tuple[str, ...] | list[str] | set[str] | None = None,
    ) -> Order:
        """Async :meth:`BitcoinVn.wait_for_order`."""
        wanted = set(statuses or DEFAULT_WAIT_STATUSES)
        timeout_ms = max(0.0, float(timeout_ms))
        interval_ms = max(0.0, float(interval_ms))
        deadline = self._monotonic() + timeout_ms / 1000
        while True:
            order = await self.get_order(order_id)
            status = order.get("status")
            if status in wanted:
                return order
            if self._monotonic() >= deadline:
                raise BitcoinVnTimeoutError(
                    f"Order {order_id} was still {status} after {_ms(timeout_ms)} ms",
                    order=order,
                )
            remaining = deadline - self._monotonic()
            await self._pause(min(interval_ms / 1000, max(remaining, 0)))

    async def iter_orders(
        self,
        *,
        custom_order_id: str | None = None,
        max_pages: int = 100,
    ) -> AsyncIterator[Order]:
        """Async pages of :meth:`list_orders`."""
        for page in range(1, max_pages + 1):
            batch = await self.list_orders(page=page, custom_order_id=custom_order_id)
            for item in batch:
                yield item
            if len(batch) < ORDERS_PAGE_SIZE:
                return

    async def list_all_orders(
        self,
        *,
        custom_order_id: str | None = None,
        max_pages: int = 100,
    ) -> list[Order]:
        """Collect :meth:`iter_orders` into a list."""
        pages = self.iter_orders(custom_order_id=custom_order_id, max_pages=max_pages)
        return [item async for item in pages]

    async def iter_balance_history(
        self,
        *,
        asset_id: str | None = None,
        max_pages: int = 100,
    ) -> AsyncIterator[LedgerItem]:
        """Async pages of :meth:`list_balance_history`."""
        for page in range(1, max_pages + 1):
            batch = await self.list_balance_history(asset_id=asset_id, page=page)
            for item in batch:
                yield item
            if len(batch) < LEDGER_PAGE_SIZE:
                return

    async def list_all_balance_history(
        self,
        *,
        asset_id: str | None = None,
        max_pages: int = 100,
    ) -> list[LedgerItem]:
        """Collect :meth:`iter_balance_history` into a list."""
        return [
            item
            async for item in self.iter_balance_history(asset_id=asset_id, max_pages=max_pages)
        ]


_ASYNC_HTTP_METHODS = (
    "get_health",
    "get_info",
    "info",
    "get_pair",
    "pair",
    "get_ticker",
    "validate_address",
    "create_quote",
    "quote",
    "list_orders",
    "orders",
    "create_order",
    "fixed_swap",
    "variable_swap",
    "get_order",
    "order",
    "submit_deposit",
    "update_settle_data",
    "get_balances",
    "balances",
    "list_balance_history",
    "list_staking_offers",
    "set_auto_stake",
    "set_staking_notifications",
    "resolve_address",
    "get_guarantee_public_key",
    "get_order_guarantee",
)


def _bind_async_methods() -> None:
    for name in _ASYNC_HTTP_METHODS:
        sync_fn = getattr(_Api, name)

        @wraps(sync_fn)
        async def wrapper(
            self: AsyncBitcoinVn,
            *args: Any,
            __fn: Any = sync_fn,
            **kwargs: Any,
        ) -> Any:
            return await __fn(self, *args, **kwargs)

        setattr(AsyncBitcoinVn, name, wrapper)


_bind_async_methods()


def _segment(value: str) -> str:
    return quote(value, safe="")


def _omit_none(values: Mapping[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in values.items() if value is not None}


def _query(query: Mapping[str, Any] | None) -> dict[str, Any] | None:
    if query is None:
        return None
    params = _omit_none(query)
    return params or None


def _destination(destination: str | Mapping[str, Any] | None) -> dict[str, Any] | None:
    if destination is None or destination == "":
        return None
    if isinstance(destination, str):
        return {"address": destination}
    return dict(destination)


def _normalize_base_url(value: str | None) -> str:
    text = (value or DEFAULT_BASE_URL).strip().rstrip("/")
    return text or DEFAULT_BASE_URL


def _timeout_seconds(timeout_ms: float | None) -> float:
    if timeout_ms is None:
        return 30.0
    return float(timeout_ms) / 1000


def _validate_proxy(proxy: str) -> str:
    parsed = urlsplit(proxy)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise BitcoinVnError(
            "Proxy must be an http or https URL with a host",
            status=0,
            code=0,
        )
    return proxy


def _ms(timeout_ms: float) -> int | float:
    if timeout_ms == int(timeout_ms):
        return int(timeout_ms)
    return timeout_ms


def _header_int(response: httpx.Response, name: str) -> int | None:
    raw = response.headers.get(name)
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        value = float(text)
    except ValueError:
        return None
    if not math.isfinite(value):
        return None
    return int(value)


def _rate_limit(response: httpx.Response) -> dict[str, int] | None:
    snapshot: dict[str, int] = {}
    limit = _header_int(response, "x-ratelimit-limit")
    remaining = _header_int(response, "x-ratelimit-remaining")
    retry_after = _header_int(response, "x-ratelimit-retry-after")
    if limit is not None:
        snapshot["limit"] = limit
    if remaining is not None:
        snapshot["remaining"] = remaining
    if retry_after is not None:
        snapshot["retry_after"] = retry_after
    return snapshot or None


def _decode(response: httpx.Response, *, text: bool) -> Any:
    if response.status_code >= 400:
        raise _error_response(response)
    if text:
        return response.text
    if not response.content:
        raise BitcoinVnError(
            "Response was not JSON",
            status=response.status_code,
            code=response.status_code,
            raw="",
        )
    try:
        return response.json()
    except ValueError as exc:
        raise BitcoinVnError(
            "Response was not JSON",
            status=response.status_code,
            code=response.status_code,
            raw=response.text,
        ) from exc


def _error_response(response: httpx.Response) -> BitcoinVnError:
    retry_after = _header_int(response, "x-ratelimit-retry-after")
    limit = _header_int(response, "x-ratelimit-limit")
    remaining = _header_int(response, "x-ratelimit-remaining")
    raw: Any
    try:
        raw = response.json()
    except ValueError:
        raw = response.text
    error = raw.get("error") if isinstance(raw, dict) else None
    cls = error_class_for_status(response.status_code)
    if isinstance(error, dict):
        message = error.get("message")
        code = error.get("code")
        text = message.strip() if isinstance(message, str) and message.strip() else ""
        if not text:
            text = f"HTTP {response.status_code}"
        status_code = code if isinstance(code, int) else response.status_code
        details = error.get("details") if "details" in error else None
        return cls(
            text,
            status=response.status_code,
            code=status_code,
            raw=raw,
            details=details,
            retry_after=retry_after,
            limit=limit,
            remaining=remaining,
        )
    if isinstance(raw, str) and raw.strip():
        message = raw.strip()
    else:
        message = f"HTTP {response.status_code}"
    return cls(
        message,
        status=response.status_code,
        code=response.status_code,
        raw=raw,
        retry_after=retry_after,
        limit=limit,
        remaining=remaining,
    )
