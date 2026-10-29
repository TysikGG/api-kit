"""Asynchronous Give-SMS client."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from give_sms.client import (
    API_V1_PATH,
    DEFAULT_BASE_URL,
    HANDLER_PATH,
    PARTNER_KEY,
    RENT_PATH,
    USER_AGENT,
    _country_operator,
    _should_retry,
    decode_json,
)
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

_WAITING_HANDLER = {"STATUS_WAIT_CODE", "STATUS_WAIT_RETRY"}
_DEFAULT_RETRY_ON: tuple[str | int, ...] = (502, "ERROR_SQL")


class AsyncActivation:
    """A native order bound to the async client that created it."""

    def __init__(self, client: AsyncGiveSms, ordered: ActivationNumber) -> None:
        self.client = client
        self.id = ordered.id
        self.number = ordered.number
        self.start_time = ordered.start_time

    async def get_code(self) -> CodeResult:
        return await self.client.get_code(self.id)

    async def wait_for_code(self, timeout: float = 180, interval: float = 5) -> CodeResult:
        return await self.client.wait_for_code(self.id, timeout=timeout, interval=interval)

    async def wrong_code(self, last_id: str | int | None = None) -> CodeResult:
        return await self.client.wrong_code(self.id, last_id)

    async def repeat_code(self, last_id: str | int | None = None) -> bool:
        return await self.client.repeat_code(self.id, last_id)

    async def cancel(self) -> bool:
        return await self.client.cancel_number(self.id)

    async def ban(self) -> bool:
        return await self.client.ban_number(self.id)


class AsyncGiveSms:
    """Async client with the same methods as :class:`give_sms.GiveSms`.

    Use it as an async context manager. ``partner_key`` is sent on every request.
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
        self._client = httpx.AsyncClient(**client_kwargs)

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> AsyncGiveSms:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()

    async def call_api(
        self,
        method: str,
        extra_params: dict[str, Any] | None = None,
        allow_statuses: tuple[int, ...] = (),
    ) -> ApiEnvelope:
        return await self._with_retry(
            lambda: self._call_api_once(method, extra_params or {}, allow_statuses)
        )

    async def call_handler(self, action: str, extra_params: dict[str, Any] | None = None) -> str:
        return await self._with_retry(lambda: self._call_handler_once(action, extra_params or {}))

    async def get_balance(self) -> float:
        return parse_balance((await self.call_api("getbalance")).data)

    async def get_count(
        self,
        country: str | int | None = None,
        operator: str | None = None,
    ) -> dict[str, Any]:
        data = (await self.call_api("getcount", _country_operator(country, operator))).data
        if not isinstance(data, dict):
            raise GiveSmsError("Unexpected getcount payload", response_data=data)
        return data

    async def get_all_count(self, service: str | None = None) -> Any:
        params = {"service": service} if service is not None else {}
        return (await self.call_api("getallcount", params)).data

    async def get_all(self, service: str | None = None) -> Any:
        return await self.get_all_count(service)

    async def get_number(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> ActivationNumber:
        if not service:
            raise GiveSmsError("service is required")
        data = (
            await self.call_api(
                "getnumber",
                {
                    "service": service,
                    "country": country,
                    "operator": operator,
                    "maxPrice": max_price,
                },
            )
        ).data
        return parse_activation(data)

    async def purchase(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> AsyncActivation:
        ordered = await self.get_number(
            service, country=country, operator=operator, max_price=max_price
        )
        return AsyncActivation(self, ordered)

    async def get_code(self, order_id: str | int) -> CodeResult:
        envelope = await self.call_api("getcode", {"order_id": order_id}, allow_statuses=(400,))
        return parse_code(envelope)

    async def wrong_code(self, order_id: str | int, last_id: str | int | None = None) -> CodeResult:
        envelope = await self.call_api(
            "wrongcode",
            {"order_id": order_id, "last_id": order_id if last_id is None else last_id},
            allow_statuses=(400,),
        )
        return parse_code(envelope)

    async def repeat_code(self, order_id: str | int, last_id: str | int | None = None) -> bool:
        await self.wrong_code(order_id, last_id)
        return True

    async def cancel_number(self, order_id: str | int) -> bool:
        await self.call_api("refusenumber", {"order_id": order_id})
        return True

    async def refuse_number(self, order_id: str | int) -> bool:
        return await self.cancel_number(order_id)

    async def ban_number(self, order_id: str | int) -> bool:
        await self.call_api("bannumber", {"order_id": order_id})
        return True

    async def get_reactivation_options(self, order_id: str | int) -> Any:
        return (await self.call_api("reactivationoptions", {"order_id": order_id})).data

    async def reactivation_options(self, order_id: str | int) -> Any:
        return await self.get_reactivation_options(order_id)

    async def reactivate(
        self,
        order_id: str | int,
        duration: int | None = None,
        price: float | int | None = None,
    ) -> Any:
        return (
            await self.call_api(
                "reactivation",
                {"order_id": order_id, "duration": duration, "price": price},
            )
        ).data

    async def wait_for_code(
        self,
        order_id: str | int,
        timeout: float = 180,
        interval: float = 5,
        cancel: Callable[[], bool] | None = None,
    ) -> CodeResult:
        return await self._poll(
            lambda: self.get_code(order_id),
            lambda result: result.status != "WAIT",
            timeout,
            interval,
            cancel,
            "SMS code",
        )

    async def wait_for_next_code(
        self,
        order_id: str | int,
        last_id: str | int | None = None,
        timeout: float = 180,
        interval: float = 5,
        cancel: Callable[[], bool] | None = None,
    ) -> CodeResult:
        return await self._poll(
            lambda: self.wrong_code(order_id, last_id),
            lambda result: result.status != "WAIT",
            timeout,
            interval,
            cancel,
            "next SMS code",
        )

    async def handler_get_balance(self) -> float:
        return parse_handler_balance(await self.call_handler("getBalance"))

    async def handler_get_numbers_status(
        self,
        country: str | int | None = None,
        operator: str | None = None,
    ) -> dict[str, Any]:
        text = await self.call_handler("getNumbersStatus", _country_operator(country, operator))
        parsed = parse_json_text(text, "getNumbersStatus")
        if not isinstance(parsed, dict):
            raise GiveSmsError(f"Unexpected getNumbersStatus payload: {text}", code=text)
        return parsed

    async def handler_get_number(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> ActivationNumber:
        if not service:
            raise GiveSmsError("service is required")
        text = await self.call_handler(
            "getNumber",
            {"service": service, "country": country, "operator": operator, "maxPrice": max_price},
        )
        return parse_access_number(text)

    async def handler_set_status(self, order_id: str | int, status: int) -> str:
        return await self.call_handler("setStatus", {"id": order_id, "status": status})

    async def handler_ready(self, order_id: str | int) -> str:
        return await self.handler_set_status(order_id, 1)

    async def handler_request_another_sms(self, order_id: str | int) -> str:
        return await self.handler_set_status(order_id, 3)

    async def handler_complete(self, order_id: str | int) -> str:
        return await self.handler_set_status(order_id, 6)

    async def handler_cancel(self, order_id: str | int) -> str:
        return await self.handler_set_status(order_id, 8)

    async def handler_get_status(self, order_id: str | int) -> HandlerStatusResult:
        return parse_handler_status(await self.call_handler("getStatus", {"id": order_id}))

    async def handler_wait_for_code(
        self,
        order_id: str | int,
        timeout: float = 180,
        interval: float = 5,
        cancel: Callable[[], bool] | None = None,
    ) -> HandlerStatusResult:
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

        return await self._poll(
            lambda: self.handler_get_status(order_id),
            ready,
            timeout,
            interval,
            cancel,
            "handler SMS code",
        )

    async def handler_get_prices(
        self,
        country: str | int | None = None,
        service: str | None = None,
        tiers: int | None = None,
    ) -> Any:
        text = await self.call_handler(
            "getPrices", {"country": country, "service": service, "tiers": tiers}
        )
        return parse_json_text(text, "getPrices")

    async def handler_get_reactivation_options(self, order_id: str | int) -> dict[str, Any]:
        text = await self.call_handler("getReactivationOptions", {"id": order_id})
        parsed = parse_json_text(text, "getReactivationOptions")
        if not isinstance(parsed, dict):
            raise GiveSmsError(f"Unexpected reactivation options: {text}", code=text)
        return parsed

    async def handler_reactivate(
        self,
        order_id: str | int,
        duration: int,
        price: float | int | None = None,
    ) -> ActivationNumber:
        text = await self.call_handler(
            "reactivation",
            {"id": order_id, "duration": duration, "price": price},
        )
        return parse_access_number(text)

    async def rent_get_data_country(self, country: str) -> dict[str, Any]:
        return await self._rent_data("getdatacountry", {"country": country})

    async def rent_countries(self) -> dict[str, Any]:
        return await self._rent_data("countries")

    async def rent_all_orders(self) -> dict[str, Any]:
        return await self._rent_data("allorders")

    async def rent_create_order(
        self,
        *,
        type: str,
        period: int,
        services: str | list[Any],
        country: str,
        operator: str | None = None,
    ) -> RentOrder:
        envelope = await self._call_rent(
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

    async def rent_get_sms(self, rent_id: str | int) -> RentSmsList:
        return parse_rent_sms((await self._call_rent("getsms", {"rentid": rent_id})).data)

    async def rent_prolong(
        self, rent_id: str | int, *, type: str, period: int
    ) -> RentProlongResult:
        envelope = await self._call_rent(
            "prolong", {"rentid": rent_id, "type": type, "period": period}
        )
        return parse_rent_prolong(envelope.data)

    async def rent_wait_for_sms(
        self,
        rent_id: str | int,
        timeout: float = 180,
        interval: float = 5,
        since: int | None = None,
        cancel: Callable[[], bool] | None = None,
    ) -> RentSmsList:
        def ready(page: RentSmsList) -> bool:
            if since is None:
                return bool(page.messages)
            return any((item.timestamp or 0) > since for item in page.messages)

        return await self._poll(
            lambda: self.rent_get_sms(rent_id),
            ready,
            timeout,
            interval,
            cancel,
            "rented-number SMS",
        )

    async def _rent_data(self, method: str, extra: dict[str, Any] | None = None) -> dict[str, Any]:
        data = (await self._call_rent(method, extra or {})).data
        if not isinstance(data, dict):
            raise GiveSmsError(f"Unexpected {method} payload", response_data=data)
        return data

    async def _call_rent(self, method: str, extra_params: dict[str, Any]) -> ApiEnvelope:
        return await self._with_retry(lambda: self._call_rent_once(method, extra_params))

    async def _call_api_once(
        self,
        method: str,
        extra_params: dict[str, Any],
        allow_statuses: tuple[int, ...],
    ) -> ApiEnvelope:
        body = await self._get_json(
            API_V1_PATH,
            {
                **clean_params(extra_params),
                "method": method,
                "userkey": self.api_key,
                "partner_key": PARTNER_KEY,
            },
        )
        return read_envelope(body, allow_statuses)

    async def _call_rent_once(self, method: str, extra_params: dict[str, Any]) -> ApiEnvelope:
        body = await self._get_json(
            RENT_PATH,
            {
                **clean_params(extra_params),
                "method": method,
                "userkey": self.api_key,
                "partner_key": PARTNER_KEY,
            },
        )
        return read_envelope(body)

    async def _call_handler_once(self, action: str, extra_params: dict[str, Any]) -> str:
        text, status = await self._get_text(
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

    async def _get_json(self, path: str, params: dict[str, Any]) -> Any:
        return decode_json(await self._request(path, params))

    async def _get_text(self, path: str, params: dict[str, Any]) -> tuple[str, int]:
        response = await self._request(path, params)
        return response.text.strip(), response.status_code

    async def _request(self, path: str, params: dict[str, Any]) -> httpx.Response:
        try:
            return await self._client.get(path, params=params)
        except httpx.TimeoutException as exc:
            raise GiveSmsTimeoutError(f"HTTP request error: {exc}") from exc
        except httpx.RequestError as exc:
            raise NetworkError(f"HTTP request error: {exc}") from exc

    async def _with_retry(self, operation: Callable[[], Awaitable[Any]]) -> Any:
        attempts = self.retries + 1
        for attempt in range(attempts):
            try:
                return await operation()
            except GiveSmsError as exc:
                if attempt == attempts - 1 or not _should_retry(exc, self.retry_on):
                    raise
                delay = self.retry_delay * (attempt + 1)
                if delay > 0:
                    await asyncio.sleep(delay)
        raise GiveSmsError("Request failed")

    async def _poll(
        self,
        read: Callable[[], Awaitable[Any]],
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
            value = await read()
            if ready(value):
                return value
            elapsed = time.monotonic() - started
            if elapsed >= timeout:
                raise GiveSmsTimeoutError(f"Timed out after {timeout}s waiting for {label}")
            pause = min(interval, timeout - elapsed)
            if pause > 0:
                await asyncio.sleep(pause)
