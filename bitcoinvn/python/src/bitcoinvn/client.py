"""Synchronous client for the BitcoinVN exchange API."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from urllib.parse import quote

import httpx

from bitcoinvn.errors import BitcoinVnError
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

DEFAULT_BASE_URL = "https://bitcoinvn.io"
USER_AGENT = "bitcoinvn/0.1.0"
REFERRER = "35b2eec68a1741ac"


class BitcoinVn:
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
    ) -> None:
        """Create a client.

        Args:
            api_key: Key sent as ``X-API-KEY``. A blank value sends no header.
            base_url: Defaults to ``https://bitcoinvn.io``.
            timeout_ms: Request timeout in milliseconds. Defaults to 30000.
            client: Optional ``httpx.Client``. When set, this object does not
                close it and ignores ``base_url`` and ``timeout_ms``.

        Examples:
            client = BitcoinVn(api_key)
        """
        key = api_key.strip() if api_key else ""
        self._api_key = key or None
        self._owns_client = client is None
        if client is not None:
            self._http = client
            return
        root = (base_url or DEFAULT_BASE_URL).rstrip("/")
        timeout = 30.0 if timeout_ms is None else timeout_ms / 1000
        self._http = httpx.Client(
            base_url=root,
            timeout=timeout,
            headers={
                "Accept": "application/json, text/plain",
                "User-Agent": USER_AGENT,
            },
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

    def get_health(self) -> HealthStatus:
        """``GET /api/health``.

        Examples:
            health = client.get_health()
        """
        return self._request("GET", "/api/health")

    def get_info(self) -> Info:
        """``GET /api/info``.

        Use method ids exactly as returned. Check ``depositEnabled`` or
        ``settleEnabled`` for the direction you need.

        Examples:
            info = client.get_info()
        """
        return self._request("GET", "/api/info")

    def get_pair(self, deposit_method_id: str, settle_method_id: str) -> Pair:
        """``GET /api/pairs/{depositMethodId}/{settleMethodId}``.

        A successful response does not reserve liquidity. An API key applies
        the account minimum to ``min``.

        Examples:
            pair = client.get_pair("btc", "xmr")
        """
        path = f"/api/pairs/{_segment(deposit_method_id)}/{_segment(settle_method_id)}"
        return self._request("GET", path)

    def get_ticker(self, base_asset_id: str, quote_asset_id: str) -> Ticker:
        """``GET /api/ticker/{baseAssetId}/{quoteAssetId}``.

        Asset ids are case-sensitive. ``rate`` is quote units per one base unit.

        Examples:
            ticker = client.get_ticker("BTC", "USDT")
        """
        path = f"/api/ticker/{_segment(base_asset_id)}/{_segment(quote_asset_id)}"
        return self._request("GET", path)

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
        return self._request(
            "GET",
            "/api/addresses/validate",
            query={
                "transferMethod": transfer_method,
                "address": address,
                "invoiceAmount": invoice_amount,
            },
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
        return self._request(
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
        return self._request(
            "GET",
            "/api/orders",
            query={"page": page, "customOrderId": custom_order_id},
        )

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
        return self._request("POST", "/api/orders", body=body)

    def get_order(self, order_id: str) -> Order:
        """``GET /api/orders/{id}``. ``order_id`` is the 8-character short id.

        Examples:
            order = client.get_order("BV2MTZAF")
        """
        return self._request("GET", f"/api/orders/{_segment(order_id)}")

    def submit_deposit(self, order_id: str, txid: str) -> Order:
        """``POST /api/orders/{id}/deposit``.

        Optional fast path after a supported on-chain deposit is broadcast and
        the order is ``new``. Fiat, Lightning, internal-balance, and manual
        deposits do not use this call.

        Examples:
            order = client.submit_deposit("BV2MTZAF", "0x0123456789abcdef")
        """
        return self._request(
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
        return self._request(
            "PUT",
            f"/api/orders/{_segment(order_id)}/settle-data",
            body=dict(settle_data),
        )

    def get_balances(self) -> Balances:
        """``GET /api/balances``. Requires ``X-API-KEY``.

        Examples:
            balances = client.get_balances()
        """
        return self._request("GET", "/api/balances")

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
        return self._request(
            "GET",
            "/api/balances/history",
            query={"assetId": asset_id, "page": page},
        )

    def list_staking_offers(self) -> list[Vault]:
        """``GET /api/staking``.

        Examples:
            offers = client.list_staking_offers()
        """
        return self._request("GET", "/api/staking")

    def set_auto_stake(self, offer_id: str, value: bool) -> BooleanConfiguration:
        """``PUT /api/staking/{id}/auto-stake``. Requires write access.

        Examples:
            setting = client.set_auto_stake(
                "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
                True,
            )
        """
        return self._request(
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
        return self._request(
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
        return self._request(
            "GET",
            "/api/addresses/resolve",
            query={"transferMethod": transfer_method, "name": name},
        )

    def get_guarantee_public_key(self) -> str:
        """``GET /api/guarantee/public-key``.

        Returns armored OpenPGP certificates.

        Examples:
            certificates = client.get_guarantee_public_key()
        """
        return self._request("GET", "/api/guarantee/public-key", text=True)

    def get_order_guarantee(self, order_id: str) -> str:
        """``GET /api/orders/{id}/guarantee``.

        Returns the stored clear-signed letter. Access matches ``get_order``.

        Examples:
            letter = client.get_order_guarantee("BV2MTZAF")
        """
        return self._request("GET", f"/api/orders/{_segment(order_id)}/guarantee", text=True)

    def _request(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | None = None,
        body: Mapping[str, Any] | None = None,
        text: bool = False,
    ) -> Any:
        headers: dict[str, str] = {}
        if self._api_key:
            headers["X-API-KEY"] = self._api_key
        params = _omit_none(dict(query)) if query is not None else None
        try:
            response = self._http.request(
                method,
                path,
                params=params,
                json=dict(body) if body is not None else None,
                headers=headers or None,
            )
        except httpx.HTTPError as exc:
            raise BitcoinVnError(str(exc), status=0, code=0, raw=str(exc)) from exc
        return _decode(response, text=text)


def _segment(value: str) -> str:
    return quote(value, safe="")


def _omit_none(values: Mapping[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in values.items() if value is not None}


def _retry_after(response: httpx.Response) -> int | None:
    raw = response.headers.get("x-ratelimit-retry-after")
    if raw is None or not str(raw).strip():
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _decode(response: httpx.Response, *, text: bool) -> Any:
    retry_after = _retry_after(response)
    if response.status_code >= 400:
        raise _error_response(response, retry_after)
    if text:
        return response.text
    try:
        return response.json()
    except ValueError as exc:
        raise BitcoinVnError(
            "Response was not JSON",
            status=response.status_code,
            code=response.status_code,
            raw=response.text,
        ) from exc


def _error_response(response: httpx.Response, retry_after: int | None) -> BitcoinVnError:
    raw: Any
    try:
        raw = response.json()
    except ValueError:
        raw = response.text
    error = raw.get("error") if isinstance(raw, dict) else None
    if isinstance(error, dict):
        message = error.get("message")
        code = error.get("code")
        text = message.strip() if isinstance(message, str) and message.strip() else ""
        if not text:
            text = f"HTTP {response.status_code}"
        status_code = code if isinstance(code, int) else response.status_code
        return BitcoinVnError(
            text,
            status=response.status_code,
            code=status_code,
            raw=raw,
            details=error.get("details"),
            retry_after=retry_after,
        )
    if isinstance(raw, str) and raw.strip():
        message = raw.strip()
    else:
        message = f"HTTP {response.status_code}"
    return BitcoinVnError(
        message,
        status=response.status_code,
        code=response.status_code,
        raw=raw,
        retry_after=retry_after,
    )
