import os
from typing import Any

import httpx

from .errors import SimpleSwapError
from .types import (
    CheckExchangeResult,
    EstimateResult,
    ExchangeOrder,
    RangesResult,
    SimpleSwapCurrency,
)


class SimpleSwap:
    """Client for the SimpleSwap cryptocurrency exchange API (v3).

    Attributes:
        api_key: SimpleSwap API key.
        base_url: Base URL of the API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the SimpleSwap client.

        Args:
            api_key: SimpleSwap API key. Defaults to SIMPLESWAP_API_KEY environment variable.
            base_url: Base URL for the SimpleSwap API. Defaults to https://api.simpleswap.io.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.

        Examples:
            >>> from simpleswap import SimpleSwap
            >>> client = SimpleSwap(api_key="your-api-key")
            >>> currencies = client.get_currencies()
            >>> print(len(currencies))
        """
        self.api_key = api_key or os.environ.get("SIMPLESWAP_API_KEY")
        self.base_url = (base_url or "https://api.simpleswap.io").rstrip("/")
        ua = user_agent or "simpleswap-client/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "SimpleSwap":
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
            response = self._client.request(
                method,
                path,
                params=params,
                json=json_data,
            )
            response.raise_for_status()
            data = response.json()

            if isinstance(data, dict):
                if data.get("error") is True:
                    msg = data.get("message") or "SimpleSwap API error"
                    raise SimpleSwapError(
                        message=str(msg),
                        status_code=response.status_code,
                        trace_id=data.get("traceId"),
                        response_body=data,
                    )
                if "result" in data:
                    return data["result"]

            return data
        except httpx.HTTPStatusError as e:
            try:
                data_err = e.response.json()
            except Exception:
                data_err = None
            msg = "SimpleSwap API error"
            trace_id = None
            if isinstance(data_err, dict):
                msg = data_err.get("message") or msg
                trace_id = data_err.get("traceId")
            raise SimpleSwapError(
                message=str(msg),
                status_code=e.response.status_code,
                trace_id=trace_id,
                response_body=data_err,
            ) from e
        except httpx.RequestError as e:
            raise SimpleSwapError(f"HTTP request failed: {e}") from e

    def get_currencies(self) -> list[SimpleSwapCurrency]:
        """Retrieves all supported cryptocurrencies and fiat currencies.

        Returns:
            List of supported currencies and networks.

        Examples:
            >>> currencies = client.get_currencies()
            >>> print(currencies[0]["ticker"])
        """
        return self._request("GET", "/v3/currencies")

    def get_currency(self, ticker: str, network: str) -> SimpleSwapCurrency:
        """Retrieves details for a specific currency and network.

        Args:
            ticker: Currency ticker (e.g. 'btc').
            network: Blockchain network (e.g. 'btc').

        Returns:
            Currency details.

        Examples:
            >>> btc = client.get_currency("btc", "btc")
            >>> print(btc["name"])
        """
        return self._request("GET", f"/v3/currencies/{ticker}/{network}")

    def get_estimate(
        self,
        ticker_from: str,
        ticker_to: str,
        amount: float | str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
        custom_fee: float | str | None = None,
    ) -> EstimateResult:
        """Retrieves estimated receiving amount for an exchange.

        Args:
            ticker_from: Deposit currency ticker.
            ticker_to: Receiving currency ticker.
            amount: Deposit amount.
            network_from: Deposit network.
            network_to: Receiving network.
            fixed: Fixed exchange rate flag.
            reverse: Reverse calculation flag.
            custom_fee: Customizable affiliate commission percentage.

        Returns:
            Estimated return amount and rate identification.

        Examples:
            >>> est = client.get_estimate("btc", "eth", amount="0.1")
            >>> print(est["estimatedAmount"])
        """
        params: dict[str, Any] = {
            "tickerFrom": ticker_from,
            "tickerTo": ticker_to,
            "amount": str(amount),
        }
        if network_from is not None:
            params["networkFrom"] = network_from
        if network_to is not None:
            params["networkTo"] = network_to
        if fixed is not None:
            params["fixed"] = fixed
        if reverse is not None:
            params["reverse"] = reverse
        if custom_fee is not None:
            params["customFee"] = str(custom_fee)

        return self._request("GET", "/v3/estimates", params=params)

    def get_ranges(
        self,
        ticker_from: str,
        ticker_to: str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
    ) -> RangesResult:
        """Retrieves deposit bounds (minimum and maximum amounts).

        Args:
            ticker_from: Deposit currency ticker.
            ticker_to: Receiving currency ticker.
            network_from: Deposit network.
            network_to: Receiving network.
            fixed: Fixed exchange rate flag.
            reverse: Reverse range flag.

        Returns:
            Dictionary with min and max deposit limits.

        Examples:
            >>> ranges = client.get_ranges("btc", "eth")
            >>> print(f"Min: {ranges['min']}")
        """
        params: dict[str, Any] = {
            "tickerFrom": ticker_from,
            "tickerTo": ticker_to,
        }
        if network_from is not None:
            params["networkFrom"] = network_from
        if network_to is not None:
            params["networkTo"] = network_to
        if fixed is not None:
            params["fixed"] = fixed
        if reverse is not None:
            params["reverse"] = reverse

        return self._request("GET", "/v3/ranges", params=params)

    def check_exchange(
        self,
        ticker_from: str,
        ticker_to: str,
        amount: float | str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
    ) -> CheckExchangeResult:
        """Checks if an exchange can be created for the pair and amount.

        Args:
            ticker_from: Deposit currency ticker.
            ticker_to: Receiving currency ticker.
            amount: Deposit amount.
            network_from: Deposit network.
            network_to: Receiving network.
            fixed: Fixed exchange rate flag.
            reverse: Reverse calculation flag.

        Returns:
            Dictionary with canCreate boolean.

        Examples:
            >>> check = client.check_exchange("btc", "eth", amount="0.1")
            >>> print(check["canCreate"])
        """
        params: dict[str, Any] = {
            "tickerFrom": ticker_from,
            "tickerTo": ticker_to,
            "amount": str(amount),
        }
        if network_from is not None:
            params["networkFrom"] = network_from
        if network_to is not None:
            params["networkTo"] = network_to
        if fixed is not None:
            params["fixed"] = fixed
        if reverse is not None:
            params["reverse"] = reverse

        return self._request("GET", "/v3/exchanges/check", params=params)

    def create_exchange(
        self,
        ticker_from: str,
        ticker_to: str,
        amount: float | str,
        address_to: str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        extra_id_to: str | None = None,
        user_refund_address: str | None = None,
        user_refund_extra_id: str | None = None,
        rate_id: str | None = None,
        custom_fee: float | str | None = None,
    ) -> ExchangeOrder:
        """Creates a cryptocurrency exchange order.

        Args:
            ticker_from: Deposit currency ticker.
            ticker_to: Receiving currency ticker.
            amount: Deposit amount.
            address_to: Destination wallet address.
            network_from: Deposit network.
            network_to: Receiving network.
            fixed: Fixed exchange rate flag.
            extra_id_to: Extra ID / memo for destination.
            user_refund_address: Refund wallet address.
            user_refund_extra_id: Refund extra ID.
            rate_id: Fixed rate ID.
            custom_fee: Optional customizable fee.

        Returns:
            Created order details containing deposit address.

        Examples:
            >>> order = client.create_exchange(
            ...     ticker_from="btc",
            ...     ticker_to="eth",
            ...     amount="0.1",
            ...     address_to="0xYourAddress...",
            ... )
            >>> print(order["addressFrom"])
        """
        payload: dict[str, Any] = {
            "tickerFrom": ticker_from,
            "tickerTo": ticker_to,
            "amount": str(amount),
            "addressTo": address_to,
        }
        if network_from is not None:
            payload["networkFrom"] = network_from
        if network_to is not None:
            payload["networkTo"] = network_to
        if fixed is not None:
            payload["fixed"] = fixed
        if extra_id_to is not None:
            payload["extraIdTo"] = extra_id_to
        if user_refund_address is not None:
            payload["userRefundAddress"] = user_refund_address
        if user_refund_extra_id is not None:
            payload["userRefundExtraId"] = user_refund_extra_id
        if rate_id is not None:
            payload["rateId"] = rate_id
        if custom_fee is not None:
            payload["customFee"] = custom_fee

        return self._request("POST", "/v3/exchanges", json_data=payload)

    def get_exchange(self, exchange_id: str) -> ExchangeOrder:
        """Retrieves details of an exchange order by ID.

        Args:
            exchange_id: SimpleSwap exchange ID.

        Returns:
            Exchange order details and status.

        Examples:
            >>> order = client.get_exchange("exchange-id")
            >>> print(order["status"])
        """
        return self._request("GET", f"/v3/exchanges/{exchange_id}")

    def get_exchanges(
        self,
        limit: int | None = None,
        offset: int | None = None,
        start_date: str | None = None,
        finish_date: str | None = None,
    ) -> list[ExchangeOrder]:
        """Lists previous exchange orders.

        Args:
            limit: Maximum items to return.
            offset: Pagination offset.
            start_date: ISO start date filter.
            finish_date: ISO end date filter.

        Returns:
            List of exchange orders.

        Examples:
            >>> orders = client.get_exchanges(limit=10)
            >>> print(len(orders))
        """
        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        if start_date is not None:
            params["startDate"] = start_date
        if finish_date is not None:
            params["finishDate"] = finish_date

        return self._request("GET", "/v3/exchanges", params=params)
