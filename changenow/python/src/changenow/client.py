import os
from typing import Any

import httpx

from .errors import ChangeNowError
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


def _error_parts(data: Any, fallback: str) -> tuple[str, str | None]:
    if isinstance(data, str) and data.strip():
        return data.strip(), None
    if isinstance(data, dict):
        code_source = data.get("error", data.get("code"))
        code = None if code_source is None else str(code_source)
        message_source = data.get("message", data.get("error", data.get("code")))
        message = fallback if message_source in (None, "") else str(message_source)
        return message, code
    return fallback, None


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
    ) -> None:
        """Initializes the ChangeNOW client.

        Args:
            api_key: Partner API key. Defaults to the CHANGENOW_API_KEY environment variable.
            base_url: API base URL. Defaults to https://api.changenow.io/v2.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.
            user_ip: End-user IP sent as the documented ``x-forwarded-for`` header.

        Examples:
            >>> from changenow import ChangeNow
            >>> client = ChangeNow(api_key="your-api-key")
            >>> currencies = client.get_currencies(active=True)
            >>> print(len(currencies))
        """
        self.api_key = api_key or os.environ.get("CHANGENOW_API_KEY")
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        ua = user_agent or "changenow-client/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers[CHANGENOW_API_KEY_HEADER] = self.api_key
        if user_ip:
            headers["x-forwarded-for"] = user_ip

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
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
    ) -> Any:
        try:
            response = self._client.request(method, path, params=params, json=json_data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            try:
                data_err = exc.response.json()
            except ValueError:
                data_err = exc.response.text or None
            message, code = _error_parts(data_err, "ChangeNOW API error")
            raise ChangeNowError(
                message=message,
                status_code=exc.response.status_code,
                code=code,
                response_body=data_err,
            ) from exc
        except httpx.RequestError as exc:
            raise ChangeNowError(f"HTTP request failed: {exc}") from exc

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
