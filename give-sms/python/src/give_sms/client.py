"""Synchronous Give-SMS client."""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from typing import Any

import httpx

from give_sms.errors import (
    GiveSmsAbortError,
    GiveSmsError,
    GiveSmsTimeoutError,
    NetworkError,
    ResendRequiredError,
)
from give_sms.parse import (
    clean_params,
    join_services,
    parse_access_number,
    parse_activation,
    parse_balance,
    parse_code,
    parse_handler_balance,
    parse_handler_status,
    parse_json_text,
    parse_rent_order,
    parse_rent_prolong,
    parse_rent_sms,
    read_envelope,
    throw_if_handler_error,
)
from give_sms.types import (
    ActivationNumber,
    ApiEnvelope,
    CodeResult,
    HandlerStatusResult,
    RentOrder,
    RentProlongResult,
    RentSmsList,
)

# Internal constant for Give-SMS integration. Do not change.
PARTNER_KEY = "pk_39579ba6dfd61e59"

DEFAULT_BASE_URL = "https://give-sms.com"
API_V1_PATH = "/api/v1/"
HANDLER_PATH = "/stubs/handler_api.php"
RENT_PATH = "/api/v2/rent/rent_number.php"
USER_AGENT = "give-sms-python/0.1.0"

_WAITING_HANDLER = {"STATUS_WAIT_CODE", "STATUS_WAIT_RETRY"}
_DEFAULT_RETRY_ON: tuple[str | int, ...] = (502, "ERROR_SQL")


class Activation:
    """A native order bound to the client that created it."""

    def __init__(self, client: GiveSms, ordered: ActivationNumber) -> None:
        self.client = client
        self.id = ordered.id
        self.number = ordered.number
        self.start_time = ordered.start_time

    def get_code(self) -> CodeResult:
        return self.client.get_code(self.id)

    def wait_for_code(self, timeout: float = 180, interval: float = 5) -> CodeResult:
        return self.client.wait_for_code(self.id, timeout=timeout, interval=interval)

    def wrong_code(self, last_id: str | int | None = None) -> CodeResult:
        return self.client.wrong_code(self.id, last_id)

    def repeat_code(self, last_id: str | int | None = None) -> bool:
        return self.client.repeat_code(self.id, last_id)

    def cancel(self) -> bool:
        return self.client.cancel_number(self.id)

    def ban(self) -> bool:
        return self.client.ban_number(self.id)


class GiveSms:
    """Client for the Give-SMS native, handler, and rent APIs.

    Args:
        api_key: Account API key.
        base_url: API origin. Defaults to ``https://give-sms.com``.
        timeout: Per-request timeout in seconds.
        retries: Extra attempts after network errors, timeouts, status 502, or ``ERROR_SQL``.
        retry_delay: Seconds to wait before the first retry. Later attempts back off linearly.
        retry_on: Extra status codes and handler symbols that should be retried.
        proxy: Proxy URL such as ``http://user:pass@host:8080``.
        headers: Extra request headers.

    Examples:
        >>> client = GiveSms(api_key="your_api_key")
        >>> balance = client.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        *,
        retries: int = 0,
        retry_delay: float = 1.0,
        retry_on: tuple[str | int, ...] | list[str | int] | None = None,
        proxy: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        if not api_key:
            raise GiveSmsError("API key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self.retry_delay = retry_delay
        self.retry_on: tuple[str | int, ...] = (
            tuple(retry_on) if retry_on is not None else _DEFAULT_RETRY_ON
        )
        self.proxy = proxy
        request_headers = {"Accept": "application/json, text/plain, */*", "User-Agent": USER_AGENT}
        if headers:
            request_headers.update(headers)
        client_kwargs: dict[str, Any] = {
            "base_url": self.base_url,
            "timeout": self.timeout,
            "headers": request_headers,
        }
        if proxy:
            client_kwargs["proxy"] = proxy
        self._client = httpx.Client(**client_kwargs)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> GiveSms:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def call_api(
        self,
        method: str,
        extra_params: dict[str, Any] | None = None,
        allow_statuses: tuple[int, ...] = (),
    ) -> ApiEnvelope:
        """Low-level ``/api/v1/`` call. ``partner_key`` is always sent."""
        return self._with_retry(
            lambda: self._call_api_once(method, extra_params or {}, allow_statuses)
        )

    def call_handler(self, action: str, extra_params: dict[str, Any] | None = None) -> str:
        """Low-level handler call. Known error tokens are raised."""
        return self._with_retry(lambda: self._call_handler_once(action, extra_params or {}))

    def get_balance(self) -> float:
        """Account balance via ``method=getbalance``."""
        return parse_balance(self.call_api("getbalance").data)

    def get_count(
        self,
        country: str | int | None = None,
        operator: str | None = None,
    ) -> dict[str, Any]:
        """Service counts and prices grouped by operator (``method=getcount``)."""
        data = self.call_api("getcount", _country_operator(country, operator)).data
        if not isinstance(data, dict):
            raise GiveSmsError("Unexpected getcount payload", response_data=data)
        return data

    def get_all_count(self, service: str | None = None) -> Any:
        """Every country, or one service across countries (``method=getallcount``)."""
        params = {"service": service} if service is not None else {}
        return self.call_api("getallcount", params).data

    def get_all(self, service: str | None = None) -> Any:
        """Alias of :meth:`get_all_count` kept from give-sms 0.1."""
        return self.get_all_count(service)

    def get_number(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> ActivationNumber:
        """Order a number (``method=getnumber``). It stays reserved for about 15 minutes."""
        if not service:
            raise GiveSmsError("service is required")
        data = self.call_api(
            "getnumber",
            {"service": service, "country": country, "operator": operator, "maxPrice": max_price},
        ).data
        return parse_activation(data)

    def purchase(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> Activation:
        """Order a number and return a small helper bound to this client."""
        return Activation(
            self,
            self.get_number(service, country=country, operator=operator, max_price=max_price),
        )

    def get_code(self, order_id: str | int) -> CodeResult:
        """Read the SMS (``method=getcode``). Status 400 is returned as ``status='WAIT'``."""
        envelope = self.call_api("getcode", {"order_id": order_id}, allow_statuses=(400,))
        return parse_code(envelope)

    def wrong_code(self, order_id: str | int, last_id: str | int | None = None) -> CodeResult:
        """Request the next SMS (``method=wrongcode``).

        ``last_id`` is the previous message id (``CodeResult.sms_id``). It defaults to the order id.
        """
        envelope = self.call_api(
            "wrongcode",
            {"order_id": order_id, "last_id": order_id if last_id is None else last_id},
            allow_statuses=(400,),
        )
        return parse_code(envelope)

    def repeat_code(self, order_id: str | int, last_id: str | int | None = None) -> bool:
        """Request another SMS. Returns ``True`` when the request is accepted, including a wait."""
        self.wrong_code(order_id, last_id)
        return True

    def cancel_number(self, order_id: str | int) -> bool:
        """Cancel an order (``method=refusenumber``) and release the reserved balance."""
        self.call_api("refusenumber", {"order_id": order_id})
        return True

    def refuse_number(self, order_id: str | int) -> bool:
        """Alias of :meth:`cancel_number`."""
        return self.cancel_number(order_id)

    def ban_number(self, order_id: str | int) -> bool:
        """Ban a number that cannot be used (``method=bannumber``)."""
        self.call_api("bannumber", {"order_id": order_id})
        return True

    def get_reactivation_options(self, order_id: str | int) -> Any:
        """Durations and prices for reopening an order (``method=reactivationoptions``)."""
        return self.call_api("reactivationoptions", {"order_id": order_id}).data

    def reactivation_options(self, order_id: str | int) -> Any:
        """Alias of :meth:`get_reactivation_options`."""
        return self.get_reactivation_options(order_id)

    def reactivate(
        self,
        order_id: str | int,
        duration: int | None = None,
        price: float | int | None = None,
    ) -> Any:
        """Reopen an order (``method=reactivation``). The price is charged immediately."""
        return self.call_api(
            "reactivation",
            {"order_id": order_id, "duration": duration, "price": price},
        ).data

    def wait_for_code(
        self,
        order_id: str | int,
        timeout: float = 180,
        interval: float = 5,
        cancel: Callable[[], bool] | None = None,
    ) -> CodeResult:
        """Poll :meth:`get_code` until an SMS arrives or ``timeout`` seconds elapse."""
        return self._poll(
            lambda: self.get_code(order_id),
            lambda result: result.status != "WAIT",
            timeout,
            interval,
            cancel,
            "SMS code",
        )

    def wait_for_next_code(
        self,
        order_id: str | int,
        last_id: str | int | None = None,
        timeout: float = 180,
        interval: float = 5,
        cancel: Callable[[], bool] | None = None,
    ) -> CodeResult:
        """Poll :meth:`wrong_code` until the next SMS arrives."""
        return self._poll(
            lambda: self.wrong_code(order_id, last_id),
            lambda result: result.status != "WAIT",
            timeout,
            interval,
            cancel,
            "next SMS code",
        )

    def handler_get_balance(self) -> float:
        """Balance via ``action=getBalance`` (``ACCESS_BALANCE``)."""
        return parse_handler_balance(self.call_handler("getBalance"))

    def handler_get_numbers_status(
        self,
        country: str | int | None = None,
        operator: str | None = None,
    ) -> dict[str, Any]:
        """Counts via ``action=getNumbersStatus``."""
        text = self.call_handler("getNumbersStatus", _country_operator(country, operator))
        parsed = parse_json_text(text, "getNumbersStatus")
        if not isinstance(parsed, dict):
            raise GiveSmsError(f"Unexpected getNumbersStatus payload: {text}", code=text)
        return parsed

    def handler_get_number(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> ActivationNumber:
        """Order via ``action=getNumber``."""
        if not service:
            raise GiveSmsError("service is required")
        text = self.call_handler(
            "getNumber",
            {"service": service, "country": country, "operator": operator, "maxPrice": max_price},
        )
        return parse_access_number(text)

    def handler_set_status(self, order_id: str | int, status: int) -> str:
        """``action=setStatus``. ``1`` ready, ``3`` another SMS, ``6`` finish, ``8`` cancel."""
        return self.call_handler("setStatus", {"id": order_id, "status": status})

    def handler_ready(self, order_id: str | int) -> str:
        """Confirm the number is ready for an SMS (status ``1``)."""
        return self.handler_set_status(order_id, 1)

    def handler_request_another_sms(self, order_id: str | int) -> str:
        """Request another free SMS (status ``3``)."""
        return self.handler_set_status(order_id, 3)

    def handler_complete(self, order_id: str | int) -> str:
        """Finish the activation (status ``6``)."""
        return self.handler_set_status(order_id, 6)

    def handler_cancel(self, order_id: str | int) -> str:
        """Cancel the activation (status ``8``)."""
        return self.handler_set_status(order_id, 8)

    def handler_get_status(self, order_id: str | int) -> HandlerStatusResult:
        """``action=getStatus``."""
        return parse_handler_status(self.call_handler("getStatus", {"id": order_id}))

    def handler_wait_for_code(
        self,
        order_id: str | int,
        timeout: float = 180,
        interval: float = 5,
        cancel: Callable[[], bool] | None = None,
    ) -> HandlerStatusResult:
        """Poll until ``STATUS_OK``. Cancel and resend states are raised immediately."""

        def ready(result: HandlerStatusResult) -> bool:
            if result.status == "STATUS_CANCEL":
                raise GiveSmsError(
                    "Activation cancelled", code="STATUS_CANCEL", response_data=result.raw
                )
            if result.status == "STATUS_WAIT_RESEND":
                raise ResendRequiredError(
                    "The service must resend the SMS, then set status to 6",
                    code="STATUS_WAIT_RESEND",
                    response_data=result.raw,
                )
            return result.status not in _WAITING_HANDLER

        return self._poll(
            lambda: self.handler_get_status(order_id),
            ready,
            timeout,
            interval,
            cancel,
            "handler SMS code",
        )

    def handler_get_prices(
        self,
        country: str | int | None = None,
        service: str | None = None,
        tiers: int | None = None,
    ) -> Any:
        """``action=getPrices``. ``tiers=1`` returns every price level."""
        text = self.call_handler(
            "getPrices",
            {"country": country, "service": service, "tiers": tiers},
        )
        return parse_json_text(text, "getPrices")

    def handler_get_reactivation_options(self, order_id: str | int) -> dict[str, Any]:
        """``action=getReactivationOptions``. Map of minutes to price."""
        text = self.call_handler("getReactivationOptions", {"id": order_id})
        parsed = parse_json_text(text, "getReactivationOptions")
        if not isinstance(parsed, dict):
            raise GiveSmsError(f"Unexpected reactivation options: {text}", code=text)
        return parsed

    def handler_reactivate(
        self,
        order_id: str | int,
        duration: int,
        price: float | int | None = None,
    ) -> ActivationNumber:
        """``action=reactivation``. Returns the new ``ACCESS_NUMBER``."""
        text = self.call_handler(
            "reactivation", {"id": order_id, "duration": duration, "price": price}
        )
        return parse_access_number(text)

    def rent_get_data_country(self, country: str) -> dict[str, Any]:
        """Rent catalog for one country (``method=getdatacountry``)."""
        return self._rent_data("getdatacountry", {"country": country})

    def rent_countries(self) -> dict[str, Any]:
        """Rent countries and operators (``method=countries``)."""
        return self._rent_data("countries")

    def rent_all_orders(self) -> dict[str, Any]:
        """Every rent order (``method=allorders``)."""
        return self._rent_data("allorders")

    def rent_create_order(
        self,
        *,
        type: str,
        period: int,
        services: str | list[Any],
        country: str,
        operator: str | None = None,
    ) -> RentOrder:
        """Rent a number (``method=createorder``). Rentals are not refundable.

        ``type`` is ``week`` or ``month``. ``services`` is a comma-separated id list.
        """
        envelope = self._call_rent(
            "createorder",
            {
                "type": type,
                "period": period,
                "services": join_services(services),
                "country": country,
                "operator": operator,
            },
        )
        return parse_rent_order(envelope.data)

    def rent_get_sms(self, rent_id: str | int) -> RentSmsList:
        """SMS inbox for a rental (``method=getsms``)."""
        return parse_rent_sms(self._call_rent("getsms", {"rentid": rent_id}).data)

    def rent_prolong(self, rent_id: str | int, *, type: str, period: int) -> RentProlongResult:
        """Extend a rental (``method=prolong``)."""
        envelope = self._call_rent("prolong", {"rentid": rent_id, "type": type, "period": period})
        return parse_rent_prolong(envelope.data)

    def rent_wait_for_sms(
        self,
        rent_id: str | int,
        timeout: float = 180,
        interval: float = 5,
        since: int | None = None,
        cancel: Callable[[], bool] | None = None,
    ) -> RentSmsList:
        """Poll :meth:`rent_get_sms` until a message arrives."""

        def ready(page: RentSmsList) -> bool:
            if since is None:
                return bool(page.messages)
            return any((item.timestamp or 0) > since for item in page.messages)

        return self._poll(
            lambda: self.rent_get_sms(rent_id),
            ready,
            timeout,
            interval,
            cancel,
            "rented-number SMS",
        )

    def _rent_data(self, method: str, extra: dict[str, Any] | None = None) -> dict[str, Any]:
        data = self._call_rent(method, extra or {}).data
        if not isinstance(data, dict):
            raise GiveSmsError(f"Unexpected {method} payload", response_data=data)
        return data

    def _call_rent(self, method: str, extra_params: dict[str, Any]) -> ApiEnvelope:
        return self._with_retry(lambda: self._call_rent_once(method, extra_params))

    def _call_api_once(
        self,
        method: str,
        extra_params: dict[str, Any],
        allow_statuses: tuple[int, ...],
    ) -> ApiEnvelope:
        body = self._get_json(
            API_V1_PATH,
            {
                **clean_params(extra_params),
                "method": method,
                "userkey": self.api_key,
                "partner_key": PARTNER_KEY,
            },
        )
        return read_envelope(body, allow_statuses)

    def _call_rent_once(self, method: str, extra_params: dict[str, Any]) -> ApiEnvelope:
        body = self._get_json(
            RENT_PATH,
            {
                **clean_params(extra_params),
                "method": method,
                "userkey": self.api_key,
                "partner_key": PARTNER_KEY,
            },
        )
        return read_envelope(body)

    def _call_handler_once(self, action: str, extra_params: dict[str, Any]) -> str:
        text, status = self._get_text(
            HANDLER_PATH,
            {
                **clean_params(extra_params),
                "action": action,
                "api_key": self.api_key,
                "partner_key": PARTNER_KEY,
            },
        )
        if status >= 400 and not text:
            raise GiveSmsError(f"Handler request failed with HTTP {status}", code=status)
        throw_if_handler_error(text)
        return text

    def _get_json(self, path: str, params: dict[str, Any]) -> Any:
        response = self._request(path, params)
        return decode_json(response)

    def _get_text(self, path: str, params: dict[str, Any]) -> tuple[str, int]:
        response = self._request(path, params)
        return response.text.strip(), response.status_code

    def _request(self, path: str, params: dict[str, Any]) -> httpx.Response:
        try:
            return self._client.get(path, params=params)
        except httpx.TimeoutException as exc:
            raise GiveSmsTimeoutError(f"HTTP request error: {exc}") from exc
        except httpx.RequestError as exc:
            raise NetworkError(f"HTTP request error: {exc}") from exc

    def _with_retry(self, operation: Callable[[], Any]) -> Any:
        attempts = self.retries + 1
        for attempt in range(attempts):
            try:
                return operation()
            except GiveSmsError as exc:
                if attempt == attempts - 1 or not _should_retry(exc, self.retry_on):
                    raise
                delay = self.retry_delay * (attempt + 1)
                if delay > 0:
                    time.sleep(delay)
        raise GiveSmsError("Request failed")

    def _poll(
        self,
        read: Callable[[], Any],
        ready: Callable[[Any], bool],
        timeout: float,
        interval: float,
        cancel: Callable[[], bool] | None,
        label: str,
    ) -> Any:
        started = time.monotonic()
        while True:
            if cancel is not None and cancel():
                raise GiveSmsAbortError("Operation aborted")
            value = read()
            if ready(value):
                return value
            elapsed = time.monotonic() - started
            if elapsed >= timeout:
                raise GiveSmsTimeoutError(f"Timed out after {timeout}s waiting for {label}")
            pause = min(interval, timeout - elapsed)
            if pause > 0:
                time.sleep(pause)


def _country_operator(country: str | int | None, operator: str | None) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if country is not None:
        params["country"] = country
    if operator is not None:
        params["operator"] = operator
    return params


def _should_retry(exc: GiveSmsError, retry_on: tuple[str | int, ...]) -> bool:
    if exc.code in ("NETWORK", "TIMEOUT"):
        return True
    return any(code == exc.code or str(code) == str(exc.code) for code in retry_on)


def decode_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except json.JSONDecodeError as exc:
        if response.status_code >= 400:
            raise GiveSmsError(
                f"HTTP {response.status_code}: {response.text}",
                code=response.status_code,
                response_data=response.text,
            ) from exc
        raise GiveSmsError(
            f"Invalid JSON response: {response.text}",
            code=response.status_code,
            response_data=response.text,
        ) from exc
