"""Asynchronous client for the Grizzly SMS activation API."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Mapping
from typing import Any

import httpx

from grizzly_sms.client import (
    _HANDLER,
    DEFAULT_BASE_URL,
    REF_ID,
    USER_AGENT,
    GrizzlySms,
    _decode,
    _message_from_status,
    _query_text,
    _require_text,
)
from grizzly_sms.errors import (
    MUTATING_ACTIONS,
    RETRYABLE_HTTP_STATUSES,
    GrizzlySmsError,
    HttpStatusError,
    assert_not_api_error,
    error_from,
    is_retryable_api_body,
)
from grizzly_sms.parse import (
    expect_rent_success,
    flatten_prices,
    parse_access_number,
    parse_activations,
    parse_balance,
    parse_countries,
    parse_number_v2,
    parse_numbers_status,
    parse_rent_history,
    parse_rent_phone,
    parse_rent_prices,
    parse_rent_status,
    parse_services,
    parse_set_status,
    parse_status,
)
from grizzly_sms.types import (
    ActivationStatus,
    ActiveActivation,
    CountryInfo,
    CryptoWallet,
    NumberStock,
    OrderedNumber,
    OrderedNumberV2,
    PriceQuote,
    ReceivedCode,
    ReceivedMessage,
    RentHistory,
    RentPhone,
    RentPrice,
    RentStatus,
    ServiceInfo,
)


class AsyncGrizzlySms:
    """Async client for ``GET /stubs/handler_api.php`` and the crypto wallet.

    Pass an ``httpx.AsyncClient`` as ``client`` to reuse a session or to mock HTTP.
    ``ref_id`` stays ``tysik`` on every handler call.

    Examples:
        async with AsyncGrizzlySms(api_key) as sms:
            balance = await sms.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        timeout_ms: float | None = None,
        client: httpx.AsyncClient | None = None,
        retries: int = 0,
        retry_delay_ms: float = 1_000,
        retry_mutations: bool = False,
        proxy: str | None = None,
    ) -> None:
        """Create an async client.

        Args:
            api_key: User API key. Blank keys raise ``BAD_KEY``.
            base_url: Defaults to ``https://api.grizzlysms.com``.
            timeout_ms: Request timeout in milliseconds. Defaults to 30000.
            client: Optional ``httpx.AsyncClient``. It is not closed when passed in.
            retries: Extra attempts for reads. Default ``0``.
            retry_delay_ms: Pause between attempts. Default ``1000``.
            retry_mutations: Also retry purchases and status changes.
            proxy: Proxy URL passed to ``httpx``. Ignored when ``client`` is set.

        Examples:
            sms = AsyncGrizzlySms(api_key)
        """
        if not api_key or not api_key.strip():
            raise error_from("BAD_KEY", "API key is required")
        self._api_key = api_key.strip()
        self._retries = max(0, retries)
        self._retry_delay_ms = retry_delay_ms
        self._retry_mutations = retry_mutations
        self._owns_client = client is None
        if client is not None:
            self._http = client
            return
        root = (base_url or DEFAULT_BASE_URL).rstrip("/")
        timeout = 30.0 if timeout_ms is None else timeout_ms / 1000
        try:
            self._http = httpx.AsyncClient(
                base_url=root,
                timeout=timeout,
                proxy=proxy,
                headers={
                    "Accept": "application/json, text/plain",
                    "User-Agent": USER_AGENT,
                },
            )
        except ValueError as exc:
            raise error_from("BAD_ACTION", str(exc)) from exc

    async def aclose(self) -> None:
        """Close the HTTP client when this object created it.

        Examples:
            await sms.aclose()
        """
        if self._owns_client:
            await self._http.aclose()

    async def __aenter__(self) -> AsyncGrizzlySms:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def call(self, action: str, params: Mapping[str, Any] | None = None) -> Any:
        """Call ``handler_api.php`` for one ``action``.

        Examples:
            raw = await sms.call("getBalance")
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
        data = await self._request("GET", _HANDLER, params=query, action=action)
        assert_not_api_error(data)
        return data

    async def get_balance(self, *, version: int | None = None) -> float:
        """Return the account balance.

        Examples:
            balance = await sms.get_balance()
        """
        data = await self.call("getBalance", {"version": version})
        return parse_balance(_require_text(data))

    async def get_number(self, service: str, **kwargs: Any) -> OrderedNumber:
        """Order a number. Keyword arguments match ``GrizzlySms.get_number``.

        Examples:
            ordered = await sms.get_number("tg", country="any")
        """
        data = await self.call("getNumber", self._numbers(service, kwargs))
        return parse_access_number(_require_text(data))

    async def get_number_v2(self, service: str, **kwargs: Any) -> OrderedNumberV2:
        """Order a number and return price, currency, and timestamps.

        Examples:
            ordered = await sms.get_number_v2("tg", country=12)
        """
        data = await self.call("getNumberV2", self._numbers(service, kwargs))
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_number_v2(data)

    async def set_status(
        self,
        activation_id: str | int,
        status: int,
        forward: str | int | bool | None = None,
    ) -> str:
        """Change an activation status.

        Examples:
            await sms.set_status(activation_id, 6)
        """
        data = await self.call(
            "setStatus", {"id": activation_id, "status": status, "forward": _flag(forward)}
        )
        return parse_set_status(_require_text(data))

    async def ready(self, activation_id: str | int) -> str:
        """Tell the service that the SMS was sent.

        Examples:
            await sms.ready(activation_id)
        """
        return await self.set_status(activation_id, 1)

    async def request_another_code(self, activation_id: str | int) -> str:
        """Ask for another code on the same number.

        Examples:
            await sms.request_another_code(activation_id)
        """
        return await self.set_status(activation_id, 3)

    async def complete(self, activation_id: str | int) -> str:
        """Finish the activation.

        Examples:
            await sms.complete(activation_id)
        """
        return await self.set_status(activation_id, 6)

    async def cancel(self, activation_id: str | int, status: int = 8) -> str:
        """Cancel the activation. Pass ``-1`` for the alternate cancel code.

        Examples:
            await sms.cancel(activation_id)
        """
        return await self.set_status(activation_id, status)

    async def get_status(self, activation_id: str | int) -> ActivationStatus:
        """Return the plain-text activation status.

        Examples:
            status = await sms.get_status(activation_id)
        """
        data = await self.call("getStatus", {"id": activation_id})
        return parse_status(_require_text(data))

    async def get_status_v2(self, activation_id: str | int) -> dict[str, Any]:
        """Return the JSON activation status.

        Examples:
            status = await sms.get_status_v2(activation_id)
        """
        data = await self.call("getStatusV2", {"id": activation_id})
        if isinstance(data, str) or not isinstance(data, dict):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return data

    async def wait_for_code(
        self,
        activation_id: str | int,
        *,
        interval_ms: float = 3_000,
        timeout_ms: float = 120_000,
        signal: Any = None,
        on_status: Any = None,
    ) -> ReceivedCode:
        """Poll ``get_status`` until a code arrives.

        Examples:
            received = await sms.wait_for_code(activation_id, timeout_ms=120_000)
        """
        started = time.monotonic()
        while True:
            if signal is not None and getattr(signal, "aborted", False):
                raise error_from("ABORTED", "waitForCode aborted")
            status = await self.get_status(activation_id)
            if on_status is not None:
                on_status(status)
            if status.status == "STATUS_OK" and status.code:
                return ReceivedCode(code=status.code, status="STATUS_OK")
            if status.status == "STATUS_CANCEL":
                raise error_from("STATUS_CANCEL", "Activation cancelled")
            if (time.monotonic() - started) * 1000 >= timeout_ms:
                raise error_from("TIMEOUT", "Timed out waiting for SMS code")
            await _adelay(interval_ms, signal)

    async def wait_for_message(
        self,
        activation_id: str | int,
        *,
        interval_ms: float = 3_000,
        timeout_ms: float = 120_000,
        signal: Any = None,
        on_status: Any = None,
    ) -> ReceivedMessage:
        """Poll ``get_status_v2`` until an SMS or call payload contains a code.

        Examples:
            message = await sms.wait_for_message(activation_id)
        """
        started = time.monotonic()
        while True:
            if signal is not None and getattr(signal, "aborted", False):
                raise error_from("ABORTED", "waitForCode aborted")
            status = await self.get_status_v2(activation_id)
            if on_status is not None:
                on_status(status)
            message = _message_from_status(status)
            if message is not None:
                return message
            if (time.monotonic() - started) * 1000 >= timeout_ms:
                raise error_from("TIMEOUT", "Timed out waiting for SMS code")
            await _adelay(interval_ms, signal)

    async def activate(self, service: str, **kwargs: Any) -> tuple[OrderedNumberV2, ReceivedCode]:
        """Order with ``get_number_v2``, optionally mark it ready, and wait.

        Examples:
            order, received = await sms.activate("tg", country=12, timeout_ms=1_000)
        """
        ready = kwargs.pop("ready", True)
        cancel_on_timeout = kwargs.pop("cancel_on_timeout", False)
        cancel_on_error = kwargs.pop("cancel_on_error", False)
        wait = {
            "interval_ms": kwargs.pop("interval_ms", 3_000),
            "timeout_ms": kwargs.pop("timeout_ms", 120_000),
            "signal": kwargs.pop("signal", None),
            "on_status": kwargs.pop("on_status", None),
        }
        order = await self.get_number_v2(service, **kwargs)
        if ready:
            await self.ready(order.activation_id)
        try:
            received = await self.wait_for_code(order.activation_id, **wait)
        except GrizzlySmsError as exc:
            should_cancel = (exc.code == "TIMEOUT" and cancel_on_timeout) or (
                exc.code not in {"TIMEOUT", "STATUS_CANCEL"} and cancel_on_error
            )
            if should_cancel:
                try:
                    await self.cancel(order.activation_id)
                except GrizzlySmsError:
                    pass
            raise
        return order, received

    async def get_prices(
        self, *, service: str | None = None, country: str | int | None = None
    ) -> dict[str, Any]:
        """Return prices grouped by country, then service.

        Examples:
            prices = await sms.get_prices(service="tg")
        """
        return await self._json_action("getPrices", service=service, country=country)

    async def get_prices_v2(
        self, *, service: str | None = None, country: str | int | None = None
    ) -> dict[str, Any]:
        """Return price buckets.

        Examples:
            prices = await sms.get_prices_v2(service="tg", country=0)
        """
        return await self._json_action("getPricesV2", service=service, country=country)

    async def get_prices_v3(
        self, *, service: str | None = None, country: str | int | None = None
    ) -> dict[str, Any]:
        """Return prices with per-provider offers.

        Examples:
            prices = await sms.get_prices_v3(service="tg", country=0)
        """
        return await self._json_action("getPricesV3", service=service, country=country)

    async def find_prices(
        self,
        *,
        service: str | None = None,
        country: str | int | None = None,
        min_count: float | None = None,
        max_price: float | None = None,
    ) -> list[PriceQuote]:
        """Return ``get_prices`` rows sorted by cost.

        Examples:
            quotes = await sms.find_prices(service="tg", max_price=1)
        """
        table = await self.get_prices(service=service, country=country)
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

    async def get_services(self) -> list[ServiceInfo]:
        """Return the service catalog.

        Examples:
            services = await sms.get_services()
        """
        data = await self.call("getServicesList")
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_services(data)

    async def get_countries(self) -> list[CountryInfo]:
        """Return the country catalog.

        Examples:
            countries = await sms.get_countries()
        """
        data = await self.call("getCountries")
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_countries(data)

    async def get_active_activations(self) -> list[ActiveActivation]:
        """Return activations that are still open.

        Examples:
            active = await sms.get_active_activations()
        """
        data = await self.call("getActiveActivations")
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_activations(data)

    async def get_wallet(
        self, *, coin: str | None = None, network: str | None = None
    ) -> CryptoWallet:
        """Return the static deposit address.

        Examples:
            wallet = await sms.get_wallet(coin="usdt", network="tron")
        """
        data = await self._request(
            "GET",
            "/public/crypto/wallet",
            params={
                "api_key": self._api_key,
                "coin": "usdt" if coin is None else coin,
                "network": "tron" if network is None else network,
            },
            action="getWallet",
        )
        assert_not_api_error(data)
        address = data.get("wallet_address") if isinstance(data, dict) else None
        if not address:
            raise error_from("UNEXPECTED_RESPONSE", data)
        return CryptoWallet(wallet_address=str(address))

    async def get_numbers_status(
        self,
        *,
        country: str | int | None = None,
        operator: str | None = None,
    ) -> list[NumberStock]:
        """Return available counts from ``getNumbersStatus``.

        Examples:
            stock = await sms.get_numbers_status(country=0)
        """
        data = await self.call("getNumbersStatus", {"country": country, "operator": operator})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_numbers_status(data)

    async def get_rent_number(self, service: str, country: str | int, rent_time: int) -> RentPhone:
        """Rent a number for ``rent_time`` hours.

        Examples:
            rented = await sms.get_rent_number("tg", 0, 4)
        """
        if not str(service).strip():
            raise error_from("BAD_SERVICE", "service is required")
        data = await self.call(
            "getRentNumber",
            {"service": str(service).strip(), "country": country, "rent_time": rent_time},
        )
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_phone(data)

    async def continue_rent(self, rent_id: str | int, rent_time: int) -> RentPhone:
        """Extend a rental.

        Examples:
            rented = await sms.continue_rent(rent_id, 4)
        """
        data = await self.call("continueRentNumber", {"id": rent_id, "rent_time": rent_time})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_phone(data)

    async def get_rent_status(self, rent_id: str | int) -> RentStatus:
        """Return SMS received during a rental.

        Examples:
            status = await sms.get_rent_status(rent_id)
        """
        data = await self.call("getRentStatus", {"id": rent_id})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_status(data)

    async def set_rent_status(self, rent_id: str | int, status: int) -> str:
        """Finish (``1``) or cancel (``2``) a rental.

        Examples:
            await sms.set_rent_status(rent_id, 1)
        """
        data = await self.call("setRentStatus", {"id": rent_id, "status": status})
        return expect_rent_success(data)

    async def finish_rent(self, rent_id: str | int) -> str:
        """Finish a rental.

        Examples:
            await sms.finish_rent(rent_id)
        """
        return await self.set_rent_status(rent_id, 1)

    async def cancel_rent(self, rent_id: str | int) -> str:
        """Cancel a rental.

        Examples:
            await sms.cancel_rent(rent_id)
        """
        return await self.set_rent_status(rent_id, 2)

    async def get_rent_history(self, rent_id: str | int) -> RentHistory:
        """Return past extensions of a rental.

        Examples:
            history = await sms.get_rent_history(rent_id)
        """
        data = await self.call("getRentHistory", {"id": rent_id})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_history(data)

    async def get_rent_prices(
        self,
        *,
        service: str | None = None,
        country: str | int | None = None,
        rent_time: int | None = None,
    ) -> list[RentPrice]:
        """Return rental prices.

        Examples:
            prices = await sms.get_rent_prices(service="tg", rent_time=4)
        """
        data = await self.call(
            "getRentPrices",
            {"service": service, "country": country, "rent_time": rent_time},
        )
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_prices(data)

    def _numbers(self, service: str, kwargs: dict[str, Any]) -> dict[str, Any]:
        return GrizzlySms._number_query(
            self,  # type: ignore[arg-type]
            service,
            country=kwargs.get("country"),
            max_price=kwargs.get("max_price"),
            min_price=kwargs.get("min_price"),
            provider_ids=kwargs.get("provider_ids"),
            except_provider_ids=kwargs.get("except_provider_ids"),
            phone_exception=kwargs.get("phone_exception"),
            operator=kwargs.get("operator"),
            forward=kwargs.get("forward"),
            activation_type=kwargs.get("activation_type"),
        )

    async def _json_action(
        self,
        action: str,
        *,
        service: str | None,
        country: str | int | None,
    ) -> dict[str, Any]:
        data = await self.call(action, {"service": service, "country": country})
        if isinstance(data, str) or not isinstance(data, dict):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return data

    async def _request(
        self, method: str, url: str, *, params: Mapping[str, Any], action: str
    ) -> Any:
        attempts = (
            1 if action in MUTATING_ACTIONS and not self._retry_mutations else self._retries + 1
        )
        last_error: Exception | None = None
        for attempt in range(attempts):
            try:
                response = await self._http.request(method, url, params=params)
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt + 1 < attempts:
                    await asyncio.sleep(self._retry_delay_ms / 1000)
                    continue
                raise error_from("NETWORK", str(exc)) from exc
            if response.status_code >= 400:
                if response.status_code in RETRYABLE_HTTP_STATUSES and attempt + 1 < attempts:
                    await asyncio.sleep(self._retry_delay_ms / 1000)
                    continue
                raise HttpStatusError(response.status_code, _decode(response))
            data = _decode(response)
            if attempt + 1 < attempts and is_retryable_api_body(data):
                await asyncio.sleep(self._retry_delay_ms / 1000)
                continue
            return data
        raise error_from("NETWORK", last_error)  # pragma: no cover


def _flag(forward: str | int | bool | None) -> Any:
    if forward is True:
        return 1
    if forward is False:
        return 0
    return forward


async def _adelay(ms: float, signal: Any) -> None:
    if signal is not None and getattr(signal, "aborted", False):
        raise error_from("ABORTED", "waitForCode aborted")
    deadline = time.monotonic() + (ms / 1000)
    while True:
        if signal is not None and getattr(signal, "aborted", False):
            raise error_from("ABORTED", "waitForCode aborted")
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        await asyncio.sleep(min(0.05, remaining))
