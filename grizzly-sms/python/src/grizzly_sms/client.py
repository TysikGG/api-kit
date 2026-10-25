"""Synchronous client for the Grizzly SMS activation API."""

from __future__ import annotations

import time
from collections.abc import Mapping, Sequence
from typing import Any

import httpx

from grizzly_sms.errors import GrizzlySmsError, assert_not_api_error
from grizzly_sms.parse import (
    flatten_prices,
    list_param,
    parse_access_number,
    parse_activations,
    parse_balance,
    parse_countries,
    parse_number_v2,
    parse_services,
    parse_set_status,
    parse_status,
)
from grizzly_sms.types import (
    ActivationStatus,
    ActiveActivation,
    CountryInfo,
    CryptoWallet,
    OrderedNumber,
    OrderedNumberV2,
    PriceQuote,
    ReceivedCode,
    ServiceInfo,
)

DEFAULT_BASE_URL = "https://api.grizzlysms.com"
USER_AGENT = "grizzly-sms/2.0.0"
REF_ID = "tysik"
_HANDLER = "/stubs/handler_api.php"


def _query_text(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer() and value == value:
        return str(int(value))
    return str(value)


def _decode(response: httpx.Response) -> Any:
    content_type = response.headers.get("content-type", "")
    if "json" in content_type.lower():
        try:
            return response.json()
        except ValueError:
            return response.text
    return response.text


def _require_text(data: Any) -> str:
    if not isinstance(data, str):
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    return data


class GrizzlySms:
    """Client for ``GET /stubs/handler_api.php`` and the crypto wallet.

    The API key comes from the profile settings on grizzlysms.com.
    Pass an ``httpx.Client`` as ``client`` to reuse a session or to mock HTTP.

    Examples:
        sms = GrizzlySms(api_key)
        balance = sms.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        timeout_ms: float | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        """Create a client.

        Args:
            api_key: User API key. Blank keys raise ``BAD_KEY``.
            base_url: Defaults to ``https://api.grizzlysms.com``.
            timeout_ms: Request timeout in milliseconds. Defaults to 30000.
            client: Optional ``httpx.Client``. When set, ``base_url`` and
                ``timeout_ms`` are ignored and the client is not closed.

        Examples:
            sms = GrizzlySms(api_key)
        """
        if not api_key or not api_key.strip():
            raise GrizzlySmsError("BAD_KEY", "API key is required")
        self._api_key = api_key.strip()
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
            sms.close()
        """
        if self._owns_client:
            self._http.close()

    def __enter__(self) -> GrizzlySms:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def call(self, action: str, params: Mapping[str, Any] | None = None) -> Any:
        """Call ``handler_api.php`` for one ``action``.

        Known error strings are raised as ``GrizzlySmsError``. Other text is
        returned unchanged.

        Examples:
            raw = sms.call("getBalance")
        """
        query: dict[str, str] = {
            "api_key": self._api_key,
            "action": action,
            "ref_id": REF_ID,
        }
        for key, value in (params or {}).items():
            if value is None:
                continue
            text = _query_text(value)
            if not text:
                continue
            query[key] = text
        data = self._request("GET", _HANDLER, params=query)
        assert_not_api_error(data)
        return data

    def get_balance(self) -> float:
        """Return the account balance.

        Examples:
            balance = sms.get_balance()
        """
        data = self.call("getBalance")
        return parse_balance(_require_text(data))

    def get_number(
        self,
        service: str,
        *,
        country: str | int | None = None,
        max_price: float | None = None,
        min_price: float | None = None,
        provider_ids: Sequence[str | int] | str | None = None,
        except_provider_ids: Sequence[str | int] | str | None = None,
        phone_exception: Sequence[str] | str | None = None,
    ) -> OrderedNumber:
        """Order a number.

        ``country`` may be ``"any"`` or omitted so Grizzly picks a country.

        Examples:
            ordered = sms.get_number("tg", country="any", max_price=1)
        """
        data = self.call("getNumber", self._number_query(
            service,
            country=country,
            max_price=max_price,
            min_price=min_price,
            provider_ids=provider_ids,
            except_provider_ids=except_provider_ids,
            phone_exception=phone_exception,
        ))
        return parse_access_number(_require_text(data))

    def get_number_v2(
        self,
        service: str,
        *,
        country: str | int | None = None,
        max_price: float | None = None,
        min_price: float | None = None,
        provider_ids: Sequence[str | int] | str | None = None,
        except_provider_ids: Sequence[str | int] | str | None = None,
        phone_exception: Sequence[str] | str | None = None,
    ) -> OrderedNumberV2:
        """Order a number and return price, currency, and timestamps.

        Examples:
            ordered = sms.get_number_v2("tg", country=12)
        """
        data = self.call("getNumberV2", self._number_query(
            service,
            country=country,
            max_price=max_price,
            min_price=min_price,
            provider_ids=provider_ids,
            except_provider_ids=except_provider_ids,
            phone_exception=phone_exception,
        ))
        if isinstance(data, str):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return parse_number_v2(data)

    def set_status(self, activation_id: str | int, status: int) -> str:
        """Change an activation status.

        Examples:
            sms.set_status(activation_id, ActivationAction.COMPLETE)
        """
        data = self.call("setStatus", {"id": activation_id, "status": status})
        return parse_set_status(_require_text(data))

    def ready(self, activation_id: str | int) -> str:
        """Tell the service that the SMS was sent (``status=1``).

        Examples:
            sms.ready(activation_id)
        """
        return self.set_status(activation_id, 1)

    def request_another_code(self, activation_id: str | int) -> str:
        """Ask for another code on the same number (``status=3``).

        Examples:
            sms.request_another_code(activation_id)
        """
        return self.set_status(activation_id, 3)

    def complete(self, activation_id: str | int) -> str:
        """Finish the activation (``status=6``).

        Examples:
            sms.complete(activation_id)
        """
        return self.set_status(activation_id, 6)

    def cancel(self, activation_id: str | int, status: int = 8) -> str:
        """Cancel the activation.

        The default status is ``8``. Pass ``-1`` for the alternate cancel code.

        Examples:
            sms.cancel(activation_id)
        """
        return self.set_status(activation_id, status)

    def get_status(self, activation_id: str | int) -> ActivationStatus:
        """Return the plain-text activation status.

        Examples:
            status = sms.get_status(activation_id)
        """
        data = self.call("getStatus", {"id": activation_id})
        return parse_status(_require_text(data))

    def get_status_v2(self, activation_id: str | int) -> dict[str, Any]:
        """Return the JSON activation status, including SMS and call payloads.

        Examples:
            status = sms.get_status_v2(activation_id)
        """
        data = self.call("getStatusV2", {"id": activation_id})
        if isinstance(data, str):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        if not isinstance(data, dict):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return data

    def wait_for_code(
        self,
        activation_id: str | int,
        *,
        interval_ms: float = 3_000,
        timeout_ms: float = 120_000,
        signal: Any = None,
    ) -> ReceivedCode:
        """Poll ``get_status`` until a code arrives, or the wait is cancelled.

        ``STATUS_WAIT_RESEND`` keeps the loop running. ``STATUS_CANCEL`` raises
        ``GrizzlySmsError``. ``signal`` is any object with an ``aborted`` flag.

        Examples:
            received = sms.wait_for_code(activation_id, timeout_ms=120_000)
        """
        started = time.monotonic()
        while True:
            if signal is not None and getattr(signal, "aborted", False):
                raise GrizzlySmsError("ABORTED", "waitForCode aborted")
            status = self.get_status(activation_id)
            if status.status == "STATUS_OK" and status.code:
                return ReceivedCode(code=status.code, status="STATUS_OK")
            if status.status == "STATUS_CANCEL":
                raise GrizzlySmsError("STATUS_CANCEL", "Activation cancelled")
            if (time.monotonic() - started) * 1000 >= timeout_ms:
                raise GrizzlySmsError("TIMEOUT", "Timed out waiting for SMS code")
            _delay(interval_ms, signal)

    def get_prices(
        self,
        *,
        service: str | None = None,
        country: str | int | None = None,
    ) -> dict[str, Any]:
        """Return prices grouped by country, then service.

        Examples:
            prices = sms.get_prices(service="tg")
        """
        return self._json_action("getPrices", service=service, country=country)

    def get_prices_v2(
        self,
        *,
        service: str | None = None,
        country: str | int | None = None,
    ) -> dict[str, Any]:
        """Return price buckets: price string to available count.

        Examples:
            prices = sms.get_prices_v2(service="tg", country=0)
        """
        return self._json_action("getPricesV2", service=service, country=country)

    def get_prices_v3(
        self,
        *,
        service: str | None = None,
        country: str | int | None = None,
    ) -> dict[str, Any]:
        """Return prices with per-provider offers.

        Examples:
            prices = sms.get_prices_v3(service="tg", country=0)
        """
        return self._json_action("getPricesV3", service=service, country=country)

    def find_prices(
        self,
        *,
        service: str | None = None,
        country: str | int | None = None,
        min_count: float | None = None,
        max_price: float | None = None,
    ) -> list[PriceQuote]:
        """Return ``get_prices`` rows sorted by cost, then by count descending.

        Examples:
            quotes = sms.find_prices(service="tg", min_count=10, max_price=1)
        """
        table = self.get_prices(service=service, country=country)
        quotes = flatten_prices(table)
        if service is not None:
            quotes = [quote for quote in quotes if quote.service == service]
        if country is not None:
            wanted = str(country)
            quotes = [quote for quote in quotes if quote.country == wanted]
        if min_count is not None:
            quotes = [quote for quote in quotes if quote.count >= min_count]
        if max_price is not None:
            quotes = [quote for quote in quotes if quote.cost <= max_price]
        quotes.sort(key=lambda quote: (quote.cost, -quote.count))
        return quotes

    def get_services(self) -> list[ServiceInfo]:
        """Return the service catalog (``getServicesList``).

        Examples:
            services = sms.get_services()
        """
        data = self.call("getServicesList")
        if isinstance(data, str):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return parse_services(data)

    def get_countries(self) -> list[CountryInfo]:
        """Return the country catalog.

        Examples:
            countries = sms.get_countries()
        """
        data = self.call("getCountries")
        if isinstance(data, str):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return parse_countries(data)

    def get_active_activations(self) -> list[ActiveActivation]:
        """Return activations that are still open.

        Examples:
            active = sms.get_active_activations()
        """
        data = self.call("getActiveActivations")
        if isinstance(data, str):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return parse_activations(data)

    def get_wallet(
        self,
        *,
        coin: str | None = None,
        network: str | None = None,
    ) -> CryptoWallet:
        """Return the static deposit address.

        The documented sample is ``coin="usdt"`` and ``network="tron"``.
        Amounts from 50 USD are credited automatically.

        Examples:
            wallet = sms.get_wallet(coin="usdt", network="tron")
        """
        data = self._request(
            "GET",
            "/public/crypto/wallet",
            params={
                "api_key": self._api_key,
                "coin": "usdt" if coin is None else coin,
                "network": "tron" if network is None else network,
            },
        )
        assert_not_api_error(data)
        address = data.get("wallet_address") if isinstance(data, dict) else None
        if not address:
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return CryptoWallet(wallet_address=str(address))

    def _json_action(
        self,
        action: str,
        *,
        service: str | None,
        country: str | int | None,
    ) -> dict[str, Any]:
        data = self.call(action, {"service": service, "country": country})
        if isinstance(data, str):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        if not isinstance(data, dict):
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return data

    def _number_query(
        self,
        service: str,
        *,
        country: str | int | None,
        max_price: float | None,
        min_price: float | None,
        provider_ids: Sequence[str | int] | str | None,
        except_provider_ids: Sequence[str | int] | str | None,
        phone_exception: Sequence[str] | str | None,
    ) -> dict[str, Any]:
        if service is None or not str(service).strip():
            raise GrizzlySmsError("BAD_SERVICE", "service is required")
        return {
            "service": str(service).strip(),
            "country": country,
            "maxPrice": max_price,
            "minPrice": min_price,
            "providerIds": list_param(provider_ids),
            "exceptProviderIds": list_param(except_provider_ids),
            "phoneException": list_param(phone_exception),
        }

    def _request(self, method: str, url: str, *, params: Mapping[str, Any]) -> Any:
        try:
            response = self._http.request(method, url, params=params)
        except httpx.HTTPError as exc:
            raise GrizzlySmsError("NETWORK", str(exc)) from exc
        if response.status_code >= 400:
            raise GrizzlySmsError(f"HTTP_{response.status_code}", _decode(response))
        return _decode(response)


def _delay(ms: float, signal: Any) -> None:
    if signal is not None and getattr(signal, "aborted", False):
        raise GrizzlySmsError("ABORTED", "waitForCode aborted")
    deadline = time.monotonic() + (ms / 1000)
    while True:
        if signal is not None and getattr(signal, "aborted", False):
            raise GrizzlySmsError("ABORTED", "waitForCode aborted")
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.05, remaining))
