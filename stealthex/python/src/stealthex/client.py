import os
from typing import Any

import httpx

from .errors import StealthEXError
from .types import (
    EstimateResult,
    ExchangeDetails,
    MinAmountResult,
    RangeResult,
    StealthEXCurrency,
)


class StealthEX:
    """Client for the StealthEX cryptocurrency exchange API.

    Attributes:
        api_key: StealthEX API key.
        base_url: Base URL of the API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the StealthEX client.

        Args:
            api_key: StealthEX API key. Defaults to STEALTHEX_API_KEY environment variable.
            base_url: Base URL for the StealthEX API. Defaults to https://api.stealthex.io.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.

        Examples:
            >>> from stealthex import StealthEX
            >>> client = StealthEX(api_key="your-api-key")
            >>> currencies = client.get_currencies()
            >>> print(len(currencies))
        """
        self.api_key = api_key or os.environ.get("STEALTHEX_API_KEY")
        self.base_url = (base_url or "https://api.stealthex.io").rstrip("/")
        ua = user_agent or "stealthex-client/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "StealthEX":
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
            query = dict(params or {})
            if self.api_key:
                query["api_key"] = self.api_key

            response = self._client.request(
                method,
                path,
                params=query,
                json=json_data,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            try:
                data_err = e.response.json()
            except Exception:
                data_err = None
            msg = "StealthEX API error"
            if isinstance(data_err, dict):
                msg = data_err.get("message") or data_err.get("error") or msg
            raise StealthEXError(
                message=str(msg),
                status_code=e.response.status_code,
                response_body=data_err,
            ) from e
        except httpx.RequestError as e:
            raise StealthEXError(f"HTTP request failed: {e}") from e

    def get_currencies(self, fixed: bool | None = None) -> list[StealthEXCurrency]:
        """Retrieves all supported cryptocurrencies and networks.

        Args:
            fixed: Optional filter for fixed-rate availability.

        Returns:
            List of supported currencies.

        Examples:
            >>> currencies = client.get_currencies()
            >>> print(currencies[0]["symbol"])
        """
        params = {"fixed": fixed} if fixed is not None else None
        return self._request("GET", "/api/v2/currency", params=params)

    def get_currency(self, symbol: str) -> StealthEXCurrency:
        """Retrieves details for a single currency.

        Args:
            symbol: Currency ticker symbol (e.g. 'btc').

        Returns:
            Currency details.

        Examples:
            >>> btc = client.get_currency("btc")
            >>> print(btc["name"])
        """
        return self._request("GET", f"/api/v2/currency/{symbol}")

    def get_pairs(self, symbol: str | None = None) -> list[str]:
        """Retrieves available exchange pairs.

        Args:
            symbol: Optional source currency ticker to filter available pairs.

        Returns:
            List of available pair symbols.

        Examples:
            >>> pairs = client.get_pairs("btc")
            >>> print(pairs[:5])
        """
        path = f"/api/v2/pairs/{symbol}" if symbol else "/api/v2/pairs"
        return self._request("GET", path)

    def get_range(
        self,
        from_currency: str,
        to_currency: str,
        fixed: bool | None = None,
    ) -> RangeResult:
        """Retrieves minimum and maximum deposit range for a pair.

        Args:
            from_currency: Deposit asset ticker.
            to_currency: Receiving asset ticker.
            fixed: Fixed exchange rate flag.

        Returns:
            Dictionary with min_amount and max_amount.

        Examples:
            >>> r = client.get_range("btc", "eth")
            >>> print(r["min_amount"])
        """
        params = {"fixed": fixed} if fixed is not None else None
        return self._request("GET", f"/api/v2/range/{from_currency}/{to_currency}", params=params)

    def get_min_amount(
        self,
        from_currency: str,
        to_currency: str,
        fixed: bool | None = None,
    ) -> MinAmountResult:
        """Retrieves minimal deposit amount required for a pair.

        Args:
            from_currency: Deposit asset ticker.
            to_currency: Receiving asset ticker.
            fixed: Fixed exchange rate flag.

        Returns:
            Dictionary with min_amount.

        Examples:
            >>> m = client.get_min_amount("btc", "eth")
            >>> print(m["min_amount"])
        """
        params = {"fixed": fixed} if fixed is not None else None
        return self._request("GET", f"/api/v2/min/{from_currency}/{to_currency}", params=params)

    def get_estimate(
        self,
        from_currency: str,
        to_currency: str,
        amount: float | str,
        fixed: bool | None = None,
    ) -> EstimateResult:
        """Retrieves estimated return amount for an exchange.

        Args:
            from_currency: Deposit asset ticker.
            to_currency: Receiving asset ticker.
            amount: Deposit amount.
            fixed: Fixed exchange rate flag.

        Returns:
            Dictionary with estimated_amount.

        Examples:
            >>> est = client.get_estimate("btc", "eth", "0.1")
            >>> print(est["estimated_amount"])
        """
        params: dict[str, Any] = {"amount": str(amount)}
        if fixed is not None:
            params["fixed"] = fixed

        path = f"/api/v2/estimate/{from_currency}/{to_currency}"
        return self._request("GET", path, params=params)

    def create_exchange(
        self,
        currency_from: str,
        currency_to: str,
        amount_from: float | str,
        address_to: str,
        amount_to: float | str | None = None,
        extra_id_to: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        rate_id: str | None = None,
        fixed: bool | None = None,
        referral: str | None = None,
    ) -> ExchangeDetails:
        """Creates a cryptocurrency exchange order.

        Args:
            currency_from: Deposit asset symbol.
            currency_to: Receiving asset symbol.
            amount_from: Deposit amount.
            address_to: Recipient wallet address.
            amount_to: Receiving amount (optional).
            extra_id_to: Destination memo / extra ID (optional).
            refund_address: Refund wallet address (optional).
            refund_extra_id: Refund memo / extra ID (optional).
            rate_id: Rate ID for fixed rates.
            fixed: Fixed exchange rate flag.
            referral: Optional referral identifier.

        Returns:
            Order details containing deposit address.

        Examples:
            >>> order = client.create_exchange(
            ...     currency_from="btc",
            ...     currency_to="eth",
            ...     amount_from="0.1",
            ...     address_to="0xYourAddress...",
            ... )
            >>> print(order["address_from"])
        """
        payload: dict[str, Any] = {
            "currency_from": currency_from,
            "currency_to": currency_to,
            "amount_from": str(amount_from),
            "address_to": address_to,
        }
        if amount_to is not None:
            payload["amount_to"] = str(amount_to)
        if extra_id_to is not None:
            payload["extra_id_to"] = extra_id_to
        if refund_address is not None:
            payload["refund_address"] = refund_address
        if refund_extra_id is not None:
            payload["refund_extra_id"] = refund_extra_id
        if rate_id is not None:
            payload["rate_id"] = rate_id
        if fixed is not None:
            payload["fixed"] = fixed
        if referral is not None:
            payload["referral"] = referral

        return self._request("POST", "/api/v2/exchange", json_data=payload)

    def get_exchange(self, exchange_id: str) -> ExchangeDetails:
        """Retrieves details and status of an exchange by ID.

        Args:
            exchange_id: StealthEX exchange ID.

        Returns:
            Exchange details.

        Examples:
            >>> order = client.get_exchange("exchange-id")
            >>> print(order["status"])
        """
        return self._request("GET", f"/api/v2/exchange/{exchange_id}")

    def get_exchanges(self, limit: int | None = None) -> list[ExchangeDetails]:
        """Lists previous transactions.

        Args:
            limit: Maximum items to return.

        Returns:
            List of exchange details.

        Examples:
            >>> txs = client.get_exchanges(limit=10)
            >>> print(len(txs))
        """
        params = {"limit": limit} if limit is not None else None
        return self._request("GET", "/api/v2/exchanges/", params=params)
