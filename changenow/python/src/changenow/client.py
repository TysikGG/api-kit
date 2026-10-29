import os
import time
from collections.abc import Callable
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import quote, urlparse

import httpx

from .errors import (
    ChangeNowError,
    ChangeNowNetworkError,
    ChangeNowTimeoutError,
    create_error,
)
from .link import (
    TERMINAL_EXCHANGE_STATUSES,
)
from .link import (
    build_exchange_link as build_exchange_link_url,
)
from .link import (
    is_terminal_exchange_status as exchange_is_terminal,
)
from .link import (
    parse_exchange_webhook as parse_webhook_body,
)
from .link import (
    split_asset_id as split_catalogue_id,
)
from .types import (
    AddressValidation,
    AvailablePair,
    ChangeNowCurrency,
    ContinueExchangeResult,
    CreatedExchange,
    CreatedPrivateTransfer,
    EstimatedAmount,
    ExchangeActions,
    ExchangesPage,
    ExchangeStatus,
    MarketEstimate,
    MinAmountResult,
    NetworkFeeResult,
    PrivateTransferEstimate,
    RangeResult,
    RefundExchangeResult,
    UserAddressesResult,
)

# Header that carries the partner API key.
#
# The published v2 collection and its 401 text send the partner key as
# `x-changenow-api-key`. The available-pairs sample in that same collection
# is the exception and uses `x-api-key`.
#
# TODO: Partner attribution header is pending confirmation from ChangeNOW.
# Partner revenue is attributed through the partner API key sent in this
# header. Change only this constant if ChangeNOW confirms a different name.
# Do not add a second partner header until they confirm one.
CHANGENOW_API_KEY_HEADER = "x-changenow-api-key"

DEFAULT_BASE_URL = "https://api.changenow.io/v2"
DEFAULT_V1_BASE_URL = "https://api.changenow.io/v1"
DEFAULT_PUBLIC_BASE_URL = "https://vip-api.changenow.io"


def _defined(values: dict[str, Any]) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for key, value in values.items():
        if value is None or value == "":
            continue
        params[key] = str(value).lower() if isinstance(value, bool) else value
    return params


def _amount(value: float | str | None) -> str | None:
    if value is None:
        return None
    return str(value)


def _body(values: dict[str, Any]) -> dict[str, Any]:
    body: dict[str, Any] = {}
    for key, value in values.items():
        if value is None or value == "":
            continue
        body[key] = value
    return body


def _retry_after(header: str | None) -> float | None:
    if header is None or header.strip() == "":
        return None
    text = header.strip()
    try:
        return max(0.0, float(text))
    except ValueError:
        pass
    try:
        when = parsedate_to_datetime(text)
    except (TypeError, ValueError, IndexError):
        return None
    if when.tzinfo is None:
        return None
    return max(0.0, when.timestamp() - time.time())


def _error_parts(data: Any, fallback: str) -> dict[str, Any]:
    if isinstance(data, str) and data.strip():
        return {"message": data.strip()}
    if isinstance(data, list):
        message = "; ".join(str(item) for item in data) or fallback
        return {"message": message}
    if isinstance(data, dict):
        errors = data.get("errors")
        if isinstance(errors, dict) and errors:
            field, value = next(iter(errors.items()))
            if isinstance(value, dict):
                code = value.get("code")
                message = value.get("message") or fallback
                return {
                    "message": str(message),
                    "code": None if code is None else str(code),
                    "field": str(field),
                    "field_errors": errors,
                    "help": None if data.get("help") is None else str(data.get("help")),
                }
            if isinstance(value, str):
                return {
                    "message": value,
                    "field": str(field),
                    "field_errors": errors,
                    "help": None if data.get("help") is None else str(data.get("help")),
                }
        code_source = data.get("error", data.get("code"))
        code = None if code_source is None else str(code_source)
        message_source = data.get("message", data.get("error", data.get("code")))
        if isinstance(message_source, list):
            message = "; ".join(str(item) for item in message_source) or fallback
        elif message_source in (None, ""):
            message = fallback
        else:
            message = str(message_source)
        return {"message": message, "code": code}
    return {"message": fallback}


class ChangeNow:
    """Client for the ChangeNOW cryptocurrency exchange API (v2).

    Attributes:
        api_key: ChangeNOW partner API key.
        base_url: Base URL of the API.
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
        """Initializes the ChangeNOW client.

        Args:
            api_key: Partner API key. Defaults to the CHANGENOW_API_KEY environment variable.
            base_url: API base URL. Defaults to https://api.changenow.io/v2.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.
            user_ip: End-user IP sent as the documented ``x-forwarded-for`` header.
            retries: Extra attempts for idempotent requests. Defaults to 2.
            retry_delay: Base delay in seconds. Doubles after each attempt.
            retry_unsafe: Also retry POST requests. Defaults to false.
            proxy: HTTP or HTTPS proxy URL.
            v1_base_url: Legacy v1 base URL.
            public_base_url: Anonymous catalogue and version-3 host.
            headers: Extra headers. The partner API key header is applied after these.

        Examples:
            >>> from changenow import ChangeNow
            >>> client = ChangeNow(api_key="your-api-key")
            >>> currencies = client.get_currencies(active=True)
            >>> print(len(currencies))
        """
        self.api_key = api_key or os.environ.get("CHANGENOW_API_KEY")
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.v1_base_url = (v1_base_url or DEFAULT_V1_BASE_URL).rstrip("/")
        self.public_base_url = (public_base_url or DEFAULT_PUBLIC_BASE_URL).rstrip("/")
        self.retries = retries
        self.retry_delay = retry_delay
        self.retry_unsafe = retry_unsafe
        self.proxy = proxy
        ua = user_agent or "changenow-client/0.1.0"

        request_headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
            **(headers or {}),
        }
        if self.api_key:
            request_headers[CHANGENOW_API_KEY_HEADER] = self.api_key
        if user_ip:
            request_headers["x-forwarded-for"] = user_ip

        if proxy:
            parsed = urlparse(proxy)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                raise ChangeNowError(f"Invalid proxy URL: {proxy}")

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=request_headers,
            proxy=proxy,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "ChangeNow":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
        *,
        base_url: str | None = None,
        expect_text: bool = False,
    ) -> Any:
        url = f"{base_url}{path}" if base_url else path
        retryable = method.upper() == "GET" or self.retry_unsafe
        attempts = max(0, self.retries) + 1
        last_error: ChangeNowError | None = None
        for attempt in range(1, attempts + 1):
            try:
                response = self._client.request(method, url, params=params, json=json_data)
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
            time.sleep(delay)
        raise last_error or ChangeNowError("ChangeNOW API request failed")

    def _require_api_key(self) -> str:
        if not self.api_key:
            raise create_error(
                "A ChangeNOW API key is required. Set api_key or CHANGENOW_API_KEY.",
                code="AUTHENTICATION_REQUIRED",
            )
        return self.api_key

    def get_currencies(
        self,
        active: bool | None = None,
        flow: str | None = None,
        buy: bool | None = None,
        sell: bool | None = None,
    ) -> list[ChangeNowCurrency]:
        """Lists currencies. Filter by activity, flow, and buy or sell availability.

        Args:
            active: Return only active currencies when true.
            flow: ``standard`` or ``fixed-rate``.
            buy: Return only currencies available to buy.
            sell: Return only currencies available to sell.

        Returns:
            Currency rows.

        Examples:
            >>> currencies = client.get_currencies(active=True, flow="standard")
        """
        params = _defined({"active": active, "flow": flow, "buy": buy, "sell": sell})
        return self._request("GET", "/exchange/currencies", params=params or None)

    def get_available_pairs(
        self,
        from_currency: str | None = None,
        to_currency: str | None = None,
        from_network: str | None = None,
        to_network: str | None = None,
        flow: str | None = None,
    ) -> list[AvailablePair]:
        """Lists tradable pairs. The unfiltered list is very large.

        Args:
            from_currency: Deposit ticker filter.
            to_currency: Payout ticker filter.
            from_network: Deposit network filter.
            to_network: Payout network filter.
            flow: ``standard`` or ``fixed-rate``.

        Returns:
            Pair rows, including which flows are enabled.

        Examples:
            >>> pairs = client.get_available_pairs(from_currency="btc", from_network="btc")
        """
        params = _defined(
            {
                "fromCurrency": from_currency,
                "toCurrency": to_currency,
                "fromNetwork": from_network,
                "toNetwork": to_network,
                "flow": flow,
            }
        )
        return self._request("GET", "/exchange/available-pairs", params=params or None)

    def get_min_amount(
        self,
        from_currency: str,
        to_currency: str,
        from_network: str | None = None,
        to_network: str | None = None,
        flow: str | None = None,
    ) -> MinAmountResult:
        """Returns the minimum deposit for a pair.

        Args:
            from_currency: Deposit ticker.
            to_currency: Payout ticker.
            from_network: Deposit network.
            to_network: Payout network.
            flow: ``standard`` or ``fixed-rate``.

        Returns:
            Minimum amount and the pair echo.

        Examples:
            >>> minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
        """
        params = _defined(
            {
                "fromCurrency": from_currency,
                "toCurrency": to_currency,
                "fromNetwork": from_network,
                "toNetwork": to_network,
                "flow": flow,
            }
        )
        return self._request("GET", "/exchange/min-amount", params=params)

    def get_range(
        self,
        from_currency: str,
        to_currency: str,
        from_network: str | None = None,
        to_network: str | None = None,
        flow: str | None = None,
    ) -> RangeResult:
        """Returns the minimum and maximum deposit for a pair.

        Args:
            from_currency: Deposit ticker.
            to_currency: Payout ticker.
            from_network: Deposit network.
            to_network: Payout network.
            flow: ``standard`` or ``fixed-rate``.

        Returns:
            Bounds. ``maxAmount`` is null when the pair is uncapped.

        Examples:
            >>> bounds = client.get_range("btc", "eth", "btc", "eth")
        """
        params = _defined(
            {
                "fromCurrency": from_currency,
                "toCurrency": to_currency,
                "fromNetwork": from_network,
                "toNetwork": to_network,
                "flow": flow,
            }
        )
        return self._request("GET", "/exchange/range", params=params)

    def get_estimated_amount(
        self,
        from_currency: str,
        to_currency: str,
        from_amount: float | str | None = None,
        to_amount: float | str | None = None,
        from_network: str | None = None,
        to_network: str | None = None,
        flow: str | None = None,
        type: str | None = None,
        use_rate_id: bool | None = None,
        is_top_up: bool | None = None,
    ) -> EstimatedAmount:
        """Estimates a standard or fixed-rate exchange.

        Set ``flow="fixed-rate"`` and ``use_rate_id=True`` to receive a ``rateId``
        that locks the amount on create.

        Args:
            from_currency: Deposit ticker.
            to_currency: Payout ticker.
            from_amount: Deposit amount. Required when type is direct.
            to_amount: Payout amount. Required when type is reverse.
            from_network: Deposit network.
            to_network: Payout network.
            flow: ``standard`` or ``fixed-rate``.
            type: ``direct`` or ``reverse``.
            use_rate_id: Ask for a fixed-rate lock id.
            is_top_up: Estimate a balance top-up without the withdrawal fee.

        Returns:
            Estimated amounts, fees, and an optional rate lock.

        Examples:
            >>> quote = client.get_estimated_amount(
            ...     "btc", "eth", from_amount="0.1", from_network="btc", to_network="eth"
            ... )
        """
        params = _defined(
            {
                "fromCurrency": from_currency,
                "toCurrency": to_currency,
                "fromAmount": _amount(from_amount),
                "toAmount": _amount(to_amount),
                "fromNetwork": from_network,
                "toNetwork": to_network,
                "flow": flow,
                "type": type,
                "useRateId": use_rate_id,
                "isTopUp": is_top_up,
            }
        )
        return self._request("GET", "/exchange/estimated-amount", params=params)

    def create_exchange(
        self,
        from_currency: str,
        to_currency: str,
        address: str,
        from_network: str | None = None,
        to_network: str | None = None,
        from_amount: float | str | None = None,
        to_amount: float | str | None = None,
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        user_id: str | int | None = None,
        payload: dict[str, str] | str | None = None,
        contact_email: str | None = None,
        source: str | None = None,
        flow: str = "standard",
        type: str | None = None,
        rate_id: str | None = None,
    ) -> CreatedExchange:
        """Creates an exchange and returns the deposit address.

        Partner attribution is the API key header. ``user_id``, ``payload``,
        ``contact_email``, and ``source`` are optional create fields.
        ``user_id`` and ``payload`` stay off until ChangeNOW enables
        "Special partner fields".

        Args:
            from_currency: Deposit ticker.
            to_currency: Payout ticker.
            address: Payout address.
            from_network: Deposit network.
            to_network: Payout network.
            from_amount: Deposit amount for a direct exchange.
            to_amount: Payout amount for a reverse exchange.
            extra_id: Payout memo or destination tag.
            refund_address: Refund address.
            refund_extra_id: Refund memo.
            user_id: Permanent partner-side user id.
            payload: Up to five partner fields, each up to 64 characters.
            contact_email: Contact email stored with the exchange.
            source: Partner source label from ChangeNOW's public create example.
            flow: ``standard`` or ``fixed-rate``.
            type: ``direct`` or ``reverse``.
            rate_id: Fixed-rate lock from an estimate with ``use_rate_id``.

        Returns:
            Created exchange, including the deposit address.

        Examples:
            >>> order = client.create_exchange(
            ...     "btc", "eth", "0xReceiver", from_network="btc", to_network="eth",
            ...     from_amount="0.1",
            ... )
        """
        body = _defined(
            {
                "fromCurrency": from_currency,
                "toCurrency": to_currency,
                "fromNetwork": from_network,
                "toNetwork": to_network,
                "fromAmount": _amount(from_amount),
                "toAmount": _amount(to_amount),
                "address": address,
                "extraId": extra_id,
                "refundAddress": refund_address,
                "refundExtraId": refund_extra_id,
                "userId": user_id,
                "payload": payload,
                "contactEmail": contact_email,
                "source": source,
                "flow": flow,
                "type": type,
                "rateId": rate_id,
            }
        )
        return self._request("POST", "/exchange", json_data=body)

    def get_exchange(self, exchange_id: str) -> ExchangeStatus:
        """Returns status and payout details for one exchange id.

        Args:
            exchange_id: Id returned by create.

        Returns:
            Exchange status.

        Examples:
            >>> status = client.get_exchange("81cc9c3a9157a6")
        """
        return self._request("GET", "/exchange/by-id", params={"id": exchange_id})

    def validate_address(self, currency: str, address: str) -> AddressValidation:
        """Validates a payout address. A failed checksum is ``result: false``.

        Args:
            currency: Currency ticker. The docs describe this as the address network.
            address: Address to check.

        Returns:
            Validation result. Invalid addresses are still HTTP 200.

        Examples:
            >>> check = client.validate_address("eth", "0x57f31ad4b64095347F87eDB1675566DAfF5EC886")
        """
        return self._request(
            "GET",
            "/validate/address",
            params={"currency": currency, "address": address},
        )

    def get_user_addresses(self, name: str) -> UserAddressesResult:
        """Resolves addresses bound to a FIO name or Unstoppable domain.

        Args:
            name: FIO address or domain such as ``name.crypto``.

        Returns:
            Resolved addresses. Unknown names return ``success: false``.

        Examples:
            >>> named = client.get_user_addresses("name@domain")
        """
        return self._request("GET", "/addresses-by-name", params={"name": name})

    def get_network_fee(
        self,
        from_currency: str,
        to_currency: str,
        from_amount: float | str,
        from_network: str | None = None,
        to_network: str | None = None,
        flow: str | None = None,
        converted_currency: str | None = None,
        converted_network: str | None = None,
    ) -> NetworkFeeResult:
        """Estimates network fees. The fee is already included in the amount estimate.

        Args:
            from_currency: Deposit ticker.
            to_currency: Payout ticker.
            from_amount: Deposit amount.
            from_network: Deposit network.
            to_network: Payout network.
            flow: ``standard`` or ``fixed-rate``.
            converted_currency: Currency used to express the converted fee.
            converted_network: Network of ``converted_currency``.

        Returns:
            Deposit, withdrawal, and total fee estimates.

        Examples:
            >>> fees = client.get_network_fee("usdt", "usdt", "100", "eth", "eth")
        """
        params = _defined(
            {
                "fromCurrency": from_currency,
                "toCurrency": to_currency,
                "fromNetwork": from_network,
                "toNetwork": to_network,
                "flow": flow,
                "fromAmount": _amount(from_amount),
                "convertedCurrency": converted_currency,
                "convertedNetwork": converted_network,
            }
        )
        return self._request("GET", "/exchange/network-fee", params=params)

    def get_market_estimate(
        self,
        from_currency: str,
        to_currency: str,
        from_amount: float | str | None = None,
        to_amount: float | str | None = None,
        type: str | None = None,
    ) -> MarketEstimate:
        """Informational crypto or fiat market estimate. Fees are not included.

        Args:
            from_currency: Source ticker, including fiat tickers such as ``usd``.
            to_currency: Destination ticker.
            from_amount: Source amount for a direct estimate.
            to_amount: Destination amount for a reverse estimate.
            type: ``direct`` or ``reverse``.

        Returns:
            Market amounts. This is not a tradable quote.

        Examples:
            >>> market = client.get_market_estimate("usdt", "btc", from_amount="1000")
        """
        params = _defined(
            {
                "fromCurrency": from_currency,
                "toCurrency": to_currency,
                "fromAmount": _amount(from_amount),
                "toAmount": _amount(to_amount),
                "type": type,
            }
        )
        return self._request("GET", "/markets/estimate", params=params)

    def get_exchanges(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_direction: str | None = None,
        sort_field: str | None = None,
        date_field: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        request_id: str | None = None,
        user_id: str | int | None = None,
        payout_address: str | None = None,
        statuses: str | list[str] | None = None,
    ) -> ExchangesPage:
        """Lists partner exchanges. ChangeNOW requires a private API key for this method.

        Args:
            limit: Page size. Greater than 0 and less than 100. Default 100.
            offset: Rows to skip.
            sort_direction: ``ASC`` or ``DESC``.
            sort_field: ``createdAt`` or ``updatedAt``.
            date_field: Date column used with the date filters.
            date_from: ISO timestamp. Exchanges created after this time.
            date_to: ISO timestamp. Exchanges created before this time.
            request_id: Filter by transaction id.
            user_id: Filter by partner user id.
            payout_address: Filter by payout address.
            statuses: One status or a list. Lists are repeated query parameters.

        Returns:
            Count and exchange rows.

        Examples:
            >>> page = client.get_exchanges(limit=10, offset=0)
        """
        params = _defined(
            {
                "limit": limit,
                "offset": offset,
                "sortDirection": sort_direction,
                "sortField": sort_field,
                "dateField": date_field,
                "dateFrom": date_from,
                "dateTo": date_to,
                "requestId": request_id,
                "userId": user_id,
                "payoutAddress": payout_address,
                "statuses": statuses,
            }
        )
        return self._request("GET", "/exchanges", params=params or None)

    def get_exchange_actions(self, exchange_id: str) -> ExchangeActions:
        """Returns whether an exchange can be pushed or refunded.

        The push block is returned under the JSON key ``continue``.

        Args:
            exchange_id: Exchange id.

        Returns:
            Available refund and continue actions.

        Examples:
            >>> actions = client.get_exchange_actions("104305fa95353d")
        """
        return self._request("GET", "/exchange/actions", params={"id": exchange_id})

    def continue_exchange(self, exchange_id: str) -> ContinueExchangeResult:
        """Continues (pushes) an exchange that actions mark as available.

        Args:
            exchange_id: Exchange id.

        Returns:
            Push result.

        Examples:
            >>> pushed = client.continue_exchange("104305fa95353d")
        """
        return self._request("POST", "/exchange/continue", json_data={"id": exchange_id})

    def refund_exchange(
        self,
        exchange_id: str,
        address: str | None = None,
        extra_id: str | None = None,
    ) -> RefundExchangeResult:
        """Refunds a deposit to the refund address or an address supplied here.

        Args:
            exchange_id: Exchange id.
            address: Refund address override.
            extra_id: Refund memo override.

        Returns:
            Whether the refund was accepted.

        Examples:
            >>> refunded = client.refund_exchange("104305fa95353d")
        """
        body = _defined({"id": exchange_id, "address": address, "extraId": extra_id})
        return self._request("POST", "/exchange/refund", json_data=body)

    def get_private_transfer_estimate(
        self,
        currency: str,
        network: str,
        to_amount: float | str,
        user_id: str | int | None = None,
    ) -> PrivateTransferEstimate:
        """Estimates a private transfer and returns the rate id required to create one.

        Args:
            currency: Asset ticker.
            network: Asset network.
            to_amount: Amount the recipient should receive.
            user_id: Partner user id. Requires "Special partner fields".

        Returns:
            Estimate and ``rateId``.

        Examples:
            >>> quote = client.get_private_transfer_estimate("eth", "eth", "10")
        """
        params = _defined(
            {
                "currency": currency,
                "network": network,
                "toAmount": _amount(to_amount),
                "userId": user_id,
            }
        )
        return self._request("GET", "/private-transfer/estimated-amount", params=params)

    def create_private_transfer(
        self,
        currency: str,
        network: str,
        to_amount: float | str,
        address: str,
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        rate_id: str | None = None,
    ) -> CreatedPrivateTransfer:
        """Creates a private transfer and returns the deposit address.

        Args:
            currency: Asset ticker.
            network: Asset network.
            to_amount: Amount the recipient should receive.
            address: Payout address.
            extra_id: Payout memo.
            refund_address: Refund address.
            refund_extra_id: Refund memo.
            rate_id: Rate id from the private-transfer estimate.

        Returns:
            Created private transfer.

        Examples:
            >>> transfer = client.create_private_transfer(
            ...     "eth", "eth", "10", "0xReceiver", rate_id="rate-id"
            ... )
        """
        body = _defined(
            {
                "currency": currency,
                "network": network,
                "toAmount": _amount(to_amount),
                "address": address,
                "extraId": extra_id,
                "refundAddress": refund_address,
                "refundExtraId": refund_extra_id,
                "rateId": rate_id,
            }
        )
        return self._request("POST", "/private-transfer", json_data=body)

    def get_transaction_status(self, exchange_id: str) -> ExchangeStatus:
        """Alias of :meth:`get_exchange`."""
        return self.get_exchange(exchange_id)

    def get_transaction(self, exchange_id: str) -> ExchangeStatus:
        """Alias of :meth:`get_exchange`."""
        return self.get_exchange(exchange_id)

    def build_exchange_link(self, from_ticker: str, to_ticker: str, **kwargs: Any) -> str:
        """Build a prefilled exchange-page link. Creates no order."""
        return build_exchange_link_url(from_ticker, to_ticker, **kwargs)

    def split_asset_id(self, asset: str) -> dict[str, str]:
        """Split a catalogue id ``ticker.network``."""
        return split_catalogue_id(asset)

    def parse_exchange_webhook(self, body: Any) -> dict[str, Any]:
        """Normalize a partner webhook body."""
        return parse_webhook_body(body)

    def is_terminal_exchange_status(self, status: str | None) -> bool:
        """Return whether ``status`` ends a wait."""
        return exchange_is_terminal(status)

    def wait_for_exchange(
        self,
        exchange_id: str,
        *,
        timeout: float = 600.0,
        interval: float = 5.0,
        terminal_statuses: tuple[str, ...] | list[str] | None = None,
        on_status: Callable[[str, dict[str, Any]], None] | None = None,
    ) -> ExchangeStatus:
        """Poll ``get_exchange`` until the status is terminal or ``timeout`` elapses."""
        return self._poll(
            lambda: self.get_exchange(exchange_id),
            timeout=timeout,
            interval=interval,
            terminal_statuses=terminal_statuses,
            on_status=on_status,
        )

    def list_assets(
        self,
        q: str | None = None,
        network: str | None = None,
        kind: str | None = None,
        fixed_rate: bool | None = None,
        popular: bool | None = None,
        limit: int | None = None,
        cursor: str | None = None,
        format: str | None = None,
        help: bool | None = None,
    ) -> Any:
        """List the anonymous asset catalogue. ``format="csv"`` returns text."""
        expect_text = format == "csv" or help is True
        params = _defined(
            {
                "q": q,
                "network": network,
                "kind": kind,
                "fixed_rate": fixed_rate,
                "popular": popular,
                "limit": limit,
                "cursor": cursor,
                "format": format,
                "help": help,
            }
        )
        return self._request(
            "GET",
            "/v1/assets",
            params=params or None,
            base_url=self.public_base_url,
            expect_text=expect_text,
        )

    def list_all_assets(
        self,
        q: str | None = None,
        network: str | None = None,
        kind: str | None = None,
        fixed_rate: bool | None = None,
        popular: bool | None = None,
        limit: int | None = None,
        max_pages: int = 100,
    ) -> list[dict[str, Any]]:
        """Follow ``next_cursor`` until the catalogue page is complete."""
        assets: list[dict[str, Any]] = []
        cursor: str | None = None
        for _page in range(max_pages):
            envelope = self.list_assets(
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

    def get_asset(self, asset: str) -> dict[str, Any]:
        """Fetch one asset by canonical id, legacy ticker, or page slug."""
        return self._request(
            "GET",
            f"/v1/assets/{quote(asset, safe='')}",
            base_url=self.public_base_url,
        )

    def get_asset_manual(self) -> str:
        """Plain-text manual for the anonymous catalogue."""
        return self._request(
            "GET",
            "/v1/assets",
            params={"help": "true"},
            base_url=self.public_base_url,
            expect_text=True,
        )

    def get_public_estimate(
        self,
        from_currency: str,
        from_network: str,
        to_currency: str,
        to_network: str,
        from_amount: float | str | None = None,
        to_amount: float | str | None = None,
        flow: str | None = None,
        type: str | None = None,
        use_rate_id: bool | None = None,
        promo_code: str | None = None,
        help: bool | None = None,
    ) -> Any:
        """Anonymous version-3 quote. Partner revenue is not attributed on this host."""
        params = _defined(
            {
                "fromCurrency": from_currency,
                "fromNetwork": from_network,
                "toCurrency": to_currency,
                "toNetwork": to_network,
                "fromAmount": _amount(from_amount),
                "toAmount": _amount(to_amount),
                "flow": flow,
                "type": type,
                "useRateId": use_rate_id,
                "promoCode": promo_code,
                "help": help,
            }
        )
        return self._request(
            "GET",
            "/v3/exchange/estimate",
            params=params,
            base_url=self.public_base_url,
            expect_text=help is True,
        )

    def get_public_manual(self) -> str:
        """Plain-text manual for the version-3 estimate, create, and status calls."""
        return self._request(
            "GET",
            "/v3/exchange/estimate",
            params={"help": "true"},
            base_url=self.public_base_url,
            expect_text=True,
        )

    def create_public_transaction(
        self,
        from_currency: str,
        from_network: str,
        to_currency: str,
        to_network: str,
        address: str,
        from_amount: float | str | None = None,
        to_amount: float | str | None = None,
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        contact_email: str | None = None,
        flow: str | None = None,
        type: str | None = None,
        rate_id: str | None = None,
        promo_code: str | None = None,
        source: str | None = None,
        link_id: str | None = None,
        help: bool | None = None,
    ) -> Any:
        """Create an anonymous version-3 order. Pass ``help=True`` for the manual."""
        body = _body(
            {
                "fromCurrency": from_currency,
                "fromNetwork": from_network,
                "toCurrency": to_currency,
                "toNetwork": to_network,
                "address": address,
                "fromAmount": _amount(from_amount),
                "toAmount": _amount(to_amount),
                "extraId": extra_id,
                "refundAddress": refund_address,
                "refundExtraId": refund_extra_id,
                "contactEmail": contact_email,
                "flow": flow,
                "type": type,
                "rateId": rate_id,
                "promoCode": promo_code,
                "source": source,
                "linkId": link_id,
                "help": help,
            }
        )
        return self._request(
            "POST",
            "/v3/transactions",
            json_data=body,
            base_url=self.public_base_url,
            expect_text=help is True,
        )

    def get_public_transaction(
        self,
        transaction_id: str,
        sub_id: str | None = None,
        help: bool | None = None,
    ) -> Any:
        """Read one anonymous version-3 order."""
        params = _defined({"subId": sub_id, "help": help})
        return self._request(
            "GET",
            f"/v3/transactions/{quote(transaction_id, safe='')}",
            params=params or None,
            base_url=self.public_base_url,
            expect_text=help is True,
        )

    def wait_for_public_transaction(
        self,
        transaction_id: str,
        *,
        timeout: float = 600.0,
        interval: float = 5.0,
        terminal_statuses: tuple[str, ...] | list[str] | None = None,
        on_status: Callable[[str, dict[str, Any]], None] | None = None,
        sub_id: str | None = None,
    ) -> dict[str, Any]:
        """Poll ``get_public_transaction`` until the status is terminal."""
        return self._poll(
            lambda: self.get_public_transaction(transaction_id, sub_id=sub_id),
            timeout=timeout,
            interval=interval,
            terminal_statuses=terminal_statuses,
            on_status=on_status,
        )

    def _poll(
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
            time.sleep(min(interval, max(0.0, remaining)))

    def get_currencies_v1(
        self,
        active: bool | None = None,
        fixed_rate: bool | None = None,
    ) -> list[dict[str, Any]]:
        """Legacy ``GET /v1/currencies``."""
        return self._v1("GET", "/currencies", {"active": active, "fixedRate": fixed_rate})

    def get_currencies_to_v1(
        self,
        ticker: str,
        fixed_rate: bool | None = None,
    ) -> list[dict[str, Any]]:
        """Legacy ``GET /v1/currencies-to/{ticker}``."""
        return self._v1(
            "GET",
            f"/currencies-to/{quote(ticker, safe='')}",
            {"fixedRate": fixed_rate},
        )

    def get_currency_info_v1(self, ticker: str) -> dict[str, Any]:
        """Legacy ``GET /v1/currencies/{ticker}``."""
        return self._v1("GET", f"/currencies/{quote(ticker, safe='')}")

    def get_min_amount_v1(self, from_ticker: str, to_ticker: str) -> dict[str, Any]:
        """Legacy ``GET /v1/min-amount/{from}_{to}``."""
        return self._v1(
            "GET",
            f"/min-amount/{quote(from_ticker, safe='')}_{quote(to_ticker, safe='')}",
        )

    def get_exchange_amount_v1(
        self,
        amount: float | str,
        from_ticker: str,
        to_ticker: str,
    ) -> dict[str, Any]:
        """Legacy floating ``GET /v1/exchange-amount/{amount}/{from}_{to}``."""
        return self._v1(
            "GET",
            f"/exchange-amount/{quote(str(amount), safe='')}/"
            f"{quote(from_ticker, safe='')}_{quote(to_ticker, safe='')}",
        )

    def get_exchange_range_v1(self, from_ticker: str, to_ticker: str) -> dict[str, Any]:
        """Legacy ``GET /v1/exchange-range/{from}_{to}``."""
        return self._v1(
            "GET",
            f"/exchange-range/{quote(from_ticker, safe='')}_{quote(to_ticker, safe='')}",
        )

    def get_fixed_rate_amount_v1(
        self,
        amount: float | str,
        from_ticker: str,
        to_ticker: str,
        use_rate_id: bool | None = None,
    ) -> dict[str, Any]:
        """Legacy fixed-rate estimate. Sends ``api_key`` when a partner key is configured."""
        return self._v1(
            "GET",
            f"/exchange-amount/fixed-rate/{quote(str(amount), safe='')}/"
            f"{quote(from_ticker, safe='')}_{quote(to_ticker, safe='')}",
            {"useRateId": use_rate_id},
        )

    def create_transaction_v1(
        self,
        from_ticker: str,
        to_ticker: str,
        address: str,
        amount: float | str,
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        user_id: str | int | None = None,
        payload: dict[str, str] | str | None = None,
        contact_email: str | None = None,
        rate_id: str | None = None,
        flow: str | None = None,
    ) -> dict[str, Any]:
        """Legacy ``POST /v1/transactions/{apiKey}``."""
        api_key = self._require_api_key()
        return self._v1(
            "POST",
            f"/transactions/{quote(api_key, safe='')}",
            None,
            self._v1_create_body(
                from_ticker,
                to_ticker,
                address,
                amount,
                extra_id,
                refund_address,
                refund_extra_id,
                user_id,
                payload,
                contact_email,
                rate_id,
                flow,
            ),
        )

    def create_fixed_rate_transaction_v1(
        self,
        from_ticker: str,
        to_ticker: str,
        address: str,
        amount: float | str,
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        user_id: str | int | None = None,
        payload: dict[str, str] | str | None = None,
        contact_email: str | None = None,
        rate_id: str | None = None,
        flow: str | None = None,
    ) -> dict[str, Any]:
        """Legacy ``POST /v1/transactions/fixed-rate/{apiKey}``."""
        api_key = self._require_api_key()
        return self._v1(
            "POST",
            f"/transactions/fixed-rate/{quote(api_key, safe='')}",
            None,
            self._v1_create_body(
                from_ticker,
                to_ticker,
                address,
                amount,
                extra_id,
                refund_address,
                refund_extra_id,
                user_id,
                payload,
                contact_email,
                rate_id,
                flow,
            ),
        )

    def get_transaction_v1(self, transaction_id: str) -> dict[str, Any]:
        """Legacy ``GET /v1/transactions/{id}/{apiKey}``."""
        api_key = self._require_api_key()
        return self._v1(
            "GET",
            f"/transactions/{quote(transaction_id, safe='')}/{quote(api_key, safe='')}",
            with_api_key_query=False,
        )

    def list_transactions_v1(
        self,
        from_ticker: str | None = None,
        to_ticker: str | None = None,
        status: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[dict[str, Any]]:
        """Legacy ``GET /v1/transactions/{apiKey}``."""
        api_key = self._require_api_key()
        return self._v1(
            "GET",
            f"/transactions/{quote(api_key, safe='')}",
            {
                "from": from_ticker,
                "to": to_ticker,
                "status": status,
                "limit": limit,
                "offset": offset,
                "dateFrom": date_from,
                "dateTo": date_to,
            },
            with_api_key_query=False,
        )

    def get_market_pairs_v1(self) -> list[str]:
        """Legacy ``GET /v1/market-info/available-pairs/``. Values look like ``btc_eth``."""
        return self._v1("GET", "/market-info/available-pairs/", with_api_key_query=False)

    def validate_address_v1(self, currency: str, address: str) -> dict[str, Any]:
        """Legacy ``GET /v1/validate/address``."""
        return self._v1(
            "GET",
            "/validate/address",
            {"currency": currency, "address": address},
            with_api_key_query=False,
        )

    def _v1_create_body(
        self,
        from_ticker: str,
        to_ticker: str,
        address: str,
        amount: float | str,
        extra_id: str | None,
        refund_address: str | None,
        refund_extra_id: str | None,
        user_id: str | int | None,
        payload: dict[str, str] | str | None,
        contact_email: str | None,
        rate_id: str | None,
        flow: str | None,
    ) -> dict[str, Any]:
        return _body(
            {
                "from": from_ticker,
                "to": to_ticker,
                "address": address,
                "amount": _amount(amount),
                "extraId": extra_id,
                "refundAddress": refund_address,
                "refundExtraId": refund_extra_id,
                "userId": user_id,
                "payload": payload,
                "contactEmail": contact_email,
                "rateId": rate_id,
                "flow": flow,
            }
        )

    def _v1(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
        *,
        with_api_key_query: bool = True,
    ) -> Any:
        query = dict(params or {})
        if with_api_key_query:
            query["api_key"] = self.api_key
        defined = _defined(query)
        return self._request(
            method,
            path,
            params=defined or None,
            json_data=json_data,
            base_url=self.v1_base_url,
        )
