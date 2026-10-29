"""Synchronous client for the Grizzly SMS activation API."""

from __future__ import annotations

import time
from collections.abc import Mapping, Sequence
from typing import Any

import httpx

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
    list_param,
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
        raise error_from("UNEXPECTED_RESPONSE", data)
    return data


def _message_from_status(data: Mapping[str, Any]) -> ReceivedMessage | None:
    sms = data.get("sms") if isinstance(data.get("sms"), dict) else None
    call = data.get("call") if isinstance(data.get("call"), dict) else None
    verification = data.get("verificationType")
    verification_type = (
        int(verification)
        if isinstance(verification, int) and not isinstance(verification, bool)
        else None
    )

    def code_of(row: Mapping[str, Any] | None) -> str | None:
        if not row:
            return None
        code = row.get("code")
        if isinstance(code, str) and code.strip():
            return code
        return None

    sms_code = code_of(sms)
    if sms_code:
        text = sms.get("text") if sms else None
        return ReceivedMessage(
            code=sms_code,
            source="sms",
            text=None if text is None else str(text),
            verification_type=verification_type,
        )
    call_code = code_of(call)
    if call_code:
        text = call.get("text") if call else None
        return ReceivedMessage(
            code=call_code,
            source="call",
            text=None if text is None else str(text),
            verification_type=verification_type,
        )
    return None


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
        retries: int = 0,
        retry_delay_ms: float = 1_000,
        retry_mutations: bool = False,
        proxy: str | None = None,
    ) -> None:
        """Create a client.

        Args:
            api_key: User API key. Blank keys raise ``BAD_KEY``.
            base_url: Defaults to ``https://api.grizzlysms.com``.
            timeout_ms: Request timeout in milliseconds. Defaults to 30000.
            client: Optional ``httpx.Client``. When set, ``base_url``,
                ``timeout_ms``, and ``proxy`` are ignored and the client is not closed.
            retries: Extra attempts for reads after a network error, HTTP 408/429/5xx,
                or ``ERROR_SQL`` / ``SERVER_ERROR``. Default ``0``.
            retry_delay_ms: Pause between attempts. Default ``1000``.
            retry_mutations: Also retry purchases and status changes. Default ``False``.
            proxy: Proxy URL passed to ``httpx``, for example ``http://127.0.0.1:8080``.

        Examples:
            sms = GrizzlySms(api_key)
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
            self._http = httpx.Client(
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
        data = self._request("GET", _HANDLER, params=query, action=action)
        assert_not_api_error(data)
        return data

    def get_balance(self, *, version: int | None = None) -> float:
        """Return the account balance.

        ``version=2`` requests the reserve-aware balance. The returned number is
        still the first amount in ``ACCESS_BALANCE``.

        Examples:
            balance = sms.get_balance()
        """
        data = self.call("getBalance", {"version": version})
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
        operator: str | None = None,
        forward: bool | int | None = None,
        activation_type: int | None = None,
    ) -> OrderedNumber:
        """Order a number.

        ``country`` may be ``"any"`` or omitted so Grizzly picks a country.

        Examples:
            ordered = sms.get_number("tg", country="any", max_price=1)
        """
        data = self.call(
            "getNumber",
            self._number_query(
                service,
                country=country,
                max_price=max_price,
                min_price=min_price,
                provider_ids=provider_ids,
                except_provider_ids=except_provider_ids,
                phone_exception=phone_exception,
                operator=operator,
                forward=forward,
                activation_type=activation_type,
            ),
        )
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
        operator: str | None = None,
        forward: bool | int | None = None,
        activation_type: int | None = None,
    ) -> OrderedNumberV2:
        """Order a number and return price, currency, and timestamps.

        Examples:
            ordered = sms.get_number_v2("tg", country=12)
        """
        data = self.call(
            "getNumberV2",
            self._number_query(
                service,
                country=country,
                max_price=max_price,
                min_price=min_price,
                provider_ids=provider_ids,
                except_provider_ids=except_provider_ids,
                phone_exception=phone_exception,
                operator=operator,
                forward=forward,
                activation_type=activation_type,
            ),
        )
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_number_v2(data)

    def set_status(
        self,
        activation_id: str | int,
        status: int,
        forward: str | int | bool | None = None,
    ) -> str:
        """Change an activation status.

        Examples:
            sms.set_status(activation_id, ActivationAction.COMPLETE)
        """
        forwarded: Any
        if forward is True:
            forwarded = 1
        elif forward is False:
            forwarded = 0
        else:
            forwarded = forward
        data = self.call(
            "setStatus",
            {"id": activation_id, "status": status, "forward": forwarded},
        )
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
        on_status: Any = None,
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
                raise error_from("ABORTED", "waitForCode aborted")
            status = self.get_status(activation_id)
            if on_status is not None:
                on_status(status)
            if status.status == "STATUS_OK" and status.code:
                return ReceivedCode(code=status.code, status="STATUS_OK")
            if status.status == "STATUS_CANCEL":
                raise error_from("STATUS_CANCEL", "Activation cancelled")
            if (time.monotonic() - started) * 1000 >= timeout_ms:
                raise error_from("TIMEOUT", "Timed out waiting for SMS code")
            _delay(interval_ms, signal)

    def wait_for_message(
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
            message = sms.wait_for_message(activation_id, timeout_ms=120_000)
        """
        started = time.monotonic()
        while True:
            if signal is not None and getattr(signal, "aborted", False):
                raise error_from("ABORTED", "waitForCode aborted")
            status = self.get_status_v2(activation_id)
            if on_status is not None:
                on_status(status)
            message = _message_from_status(status)
            if message is not None:
                return message
            if (time.monotonic() - started) * 1000 >= timeout_ms:
                raise error_from("TIMEOUT", "Timed out waiting for SMS code")
            _delay(interval_ms, signal)

    def activate(
        self,
        service: str,
        *,
        country: str | int | None = None,
        max_price: float | None = None,
        min_price: float | None = None,
        provider_ids: Sequence[str | int] | str | None = None,
        except_provider_ids: Sequence[str | int] | str | None = None,
        phone_exception: Sequence[str] | str | None = None,
        operator: str | None = None,
        forward: bool | int | None = None,
        activation_type: int | None = None,
        ready: bool = True,
        cancel_on_timeout: bool = False,
        cancel_on_error: bool = False,
        interval_ms: float = 3_000,
        timeout_ms: float = 120_000,
        signal: Any = None,
        on_status: Any = None,
    ) -> tuple[OrderedNumberV2, ReceivedCode]:
        """Order with ``get_number_v2``, optionally mark it ready, and wait.

        Ordering spends balance. ``cancel_on_timeout`` releases the number when
        the wait times out.

        Examples:
            order, received = sms.activate("tg", country=12, timeout_ms=120_000)
        """
        order = self.get_number_v2(
            service,
            country=country,
            max_price=max_price,
            min_price=min_price,
            provider_ids=provider_ids,
            except_provider_ids=except_provider_ids,
            phone_exception=phone_exception,
            operator=operator,
            forward=forward,
            activation_type=activation_type,
        )
        if ready:
            self.ready(order.activation_id)
        try:
            received = self.wait_for_code(
                order.activation_id,
                interval_ms=interval_ms,
                timeout_ms=timeout_ms,
                signal=signal,
                on_status=on_status,
            )
        except GrizzlySmsError as exc:
            should_cancel = (exc.code == "TIMEOUT" and cancel_on_timeout) or (
                exc.code not in {"TIMEOUT", "STATUS_CANCEL"} and cancel_on_error
            )
            if should_cancel:
                try:
                    self.cancel(order.activation_id)
                except GrizzlySmsError:
                    pass
            raise
        return order, received

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
            action="getWallet",
        )
        assert_not_api_error(data)
        address = data.get("wallet_address") if isinstance(data, dict) else None
        if not address:
            raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
        return CryptoWallet(wallet_address=str(address))

    def get_numbers_status(
        self,
        *,
        country: str | int | None = None,
        operator: str | None = None,
    ) -> list[NumberStock]:
        """Return available counts from ``getNumbersStatus``.

        Examples:
            stock = sms.get_numbers_status(country=0)
        """
        data = self.call("getNumbersStatus", {"country": country, "operator": operator})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_numbers_status(data)

    def get_rent_number(self, service: str, country: str | int, rent_time: int) -> RentPhone:
        """Rent a number for ``rent_time`` hours. The documented minimum is 4.

        Examples:
            rented = sms.get_rent_number("tg", 0, 4)
        """
        if not str(service).strip():
            raise error_from("BAD_SERVICE", "service is required")
        data = self.call(
            "getRentNumber",
            {"service": str(service).strip(), "country": country, "rent_time": rent_time},
        )
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_phone(data)

    def continue_rent(self, rent_id: str | int, rent_time: int) -> RentPhone:
        """Extend a rental (``continueRentNumber``).

        Examples:
            rented = sms.continue_rent(rent_id, 4)
        """
        data = self.call("continueRentNumber", {"id": rent_id, "rent_time": rent_time})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_phone(data)

    def get_rent_status(self, rent_id: str | int) -> RentStatus:
        """Return SMS received during a rental.

        Examples:
            status = sms.get_rent_status(rent_id)
        """
        data = self.call("getRentStatus", {"id": rent_id})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_status(data)

    def set_rent_status(self, rent_id: str | int, status: int) -> str:
        """Finish (``1``) or cancel (``2``) a rental.

        Examples:
            sms.set_rent_status(rent_id, RentAction.FINISH)
        """
        data = self.call("setRentStatus", {"id": rent_id, "status": status})
        return expect_rent_success(data)

    def finish_rent(self, rent_id: str | int) -> str:
        """Finish a rental.

        Examples:
            sms.finish_rent(rent_id)
        """
        return self.set_rent_status(rent_id, 1)

    def cancel_rent(self, rent_id: str | int) -> str:
        """Cancel a rental.

        Examples:
            sms.cancel_rent(rent_id)
        """
        return self.set_rent_status(rent_id, 2)

    def get_rent_history(self, rent_id: str | int) -> RentHistory:
        """Return past extensions of a rental.

        Examples:
            history = sms.get_rent_history(rent_id)
        """
        data = self.call("getRentHistory", {"id": rent_id})
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_history(data)

    def get_rent_prices(
        self,
        *,
        service: str | None = None,
        country: str | int | None = None,
        rent_time: int | None = None,
    ) -> list[RentPrice]:
        """Return rental prices.

        Examples:
            prices = sms.get_rent_prices(service="tg", country=0, rent_time=4)
        """
        data = self.call(
            "getRentPrices",
            {"service": service, "country": country, "rent_time": rent_time},
        )
        if isinstance(data, str):
            raise error_from("UNEXPECTED_RESPONSE", data)
        return parse_rent_prices(data)

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
        operator: str | None = None,
        forward: bool | int | None = None,
        activation_type: int | None = None,
    ) -> dict[str, Any]:
        if service is None or not str(service).strip():
            raise error_from("BAD_SERVICE", "service is required")
        forwarded: Any
        if forward is True:
            forwarded = 1
        elif forward is False:
            forwarded = 0
        else:
            forwarded = forward
        return {
            "service": str(service).strip(),
            "country": country,
            "maxPrice": max_price,
            "minPrice": min_price,
            "providerIds": list_param(provider_ids),
            "exceptProviderIds": list_param(except_provider_ids),
            "phoneException": list_param(phone_exception),
            "operator": operator,
            "forward": forwarded,
            "activationType": activation_type,
        }

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: Mapping[str, Any],
        action: str,
    ) -> Any:
        attempts = (
            1 if action in MUTATING_ACTIONS and not self._retry_mutations else self._retries + 1
        )
        last_error: Exception | None = None
        for attempt in range(attempts):
            try:
                response = self._http.request(method, url, params=params)
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt + 1 < attempts:
                    time.sleep(self._retry_delay_ms / 1000)
                    continue
                raise error_from("NETWORK", str(exc)) from exc
            if response.status_code >= 400:
                if response.status_code in RETRYABLE_HTTP_STATUSES and attempt + 1 < attempts:
                    time.sleep(self._retry_delay_ms / 1000)
                    continue
                raise HttpStatusError(response.status_code, _decode(response))
            data = _decode(response)
            if attempt + 1 < attempts and is_retryable_api_body(data):
                time.sleep(self._retry_delay_ms / 1000)
                continue
            return data
        raise error_from("NETWORK", last_error)  # pragma: no cover


def _delay(ms: float, signal: Any) -> None:
    if signal is not None and getattr(signal, "aborted", False):
        raise error_from("ABORTED", "waitForCode aborted")
    deadline = time.monotonic() + (ms / 1000)
    while True:
        if signal is not None and getattr(signal, "aborted", False):
            raise error_from("ABORTED", "waitForCode aborted")
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.05, remaining))
