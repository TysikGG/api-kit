from typing import Any
from urllib.parse import quote

import httpx

from .errors import ExolixError
from .types import (
    Network,
    PaginatedCurrencies,
    PaginatedNetworks,
    PaginatedTransactions,
    Rate,
    RateType,
    SortOrder,
    Transaction,
)

# Header that carries the affiliate API key.
#
# Partner attribution is the API key itself. The default affiliate share is
# 0.3%. There is no referral parameter.
EXOLIX_API_KEY_HEADER = "Authorization"

DEFAULT_BASE_URL = "https://exolix.com/api/v2"


def _defined(values: dict[str, Any]) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for key, value in values.items():
        if value is None or value == "":
            continue
        if isinstance(value, bool):
            params[key] = str(value).lower()
        elif isinstance(value, list):
            if not value:
                continue
            params[key] = ",".join(str(item) for item in value)
        else:
            params[key] = value
    return params


def _amount(value: float | str | None) -> str | None:
    if value is None:
        return None
    return str(value)


def _error_parts(data: Any, fallback: str) -> tuple[str, str | None]:
    if isinstance(data, str) and data.strip():
        return data.strip(), None
    if isinstance(data, dict):
        code_source = data.get("error")
        code = None if code_source is None else str(code_source)
        message_source = data.get("message", data.get("error"))
        if isinstance(message_source, list):
            message_source = ", ".join(str(item) for item in message_source)
        message = fallback if message_source in (None, "") else str(message_source)
        return message, code
    return fallback, None


class Exolix:
    """Client for the Exolix cryptocurrency exchange API (v2).

    Attributes:
        api_key: Affiliate API key. Sent only in the Authorization header.
        base_url: Base URL of the API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the Exolix client.

        Args:
            api_key: Affiliate API key. Not read from the environment.
                Attribution is this key (default affiliate share 0.3%).
            base_url: API base URL. Defaults to https://exolix.com/api/v2.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.

        Examples:
            >>> from exolix import Exolix
            >>> client = Exolix(api_key="your-api-key")
            >>> currencies = client.get_currencies(page=1, size=10)
            >>> print(currencies["count"])
        """
        self.api_key = api_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        ua = user_agent or "exolix-client/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers[EXOLIX_API_KEY_HEADER] = self.api_key

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "Exolix":
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
            message, code = _error_parts(data_err, "Exolix API error")
            raise ExolixError(
                message=message,
                status_code=exc.response.status_code,
                code=code,
                response_body=data_err,
            ) from exc
        except httpx.RequestError as exc:
            raise ExolixError(f"HTTP request failed: {exc}") from exc

    def get_currencies(
        self,
        page: int | None = None,
        size: int | None = None,
        search: str | None = None,
        with_networks: bool | None = None,
    ) -> PaginatedCurrencies:
        """Lists currencies. Set with_networks to include each coin's networks.

        Args:
            page: Page number.
            size: Page size.
            search: Currency code or name filter.
            with_networks: Include networks on each currency.

        Returns:
            Page of currencies and the total count.

        Examples:
            >>> page = client.get_currencies(search="BTC", with_networks=True)
        """
        params = _defined(
            {"page": page, "size": size, "search": search, "withNetworks": with_networks}
        )
        return self._request("GET", "/currencies", params=params or None)

    def get_currency_networks(self, code: str) -> list[Network]:
        """Lists networks for one currency code.

        Args:
            code: Currency code, for example ``ETH``.

        Returns:
            Networks for that currency.

        Examples:
            >>> networks = client.get_currency_networks("ETH")
        """
        return self._request("GET", f"/currencies/{quote(code, safe='')}/networks")

    def get_networks(
        self,
        page: int | None = None,
        size: int | None = None,
        search: str | None = None,
    ) -> PaginatedNetworks:
        """Lists every network in the catalog.

        Args:
            page: Page number.
            size: Page size.
            search: Network name filter.

        Returns:
            Page of networks and the total count.

        Examples:
            >>> networks = client.get_networks(page=1, size=50)
        """
        params = _defined({"page": page, "size": size, "search": search})
        return self._request("GET", "/currencies/networks", params=params or None)

    def get_rate(
        self,
        coin_from: str,
        coin_to: str,
        rate_type: RateType,
        *,
        network_from: str | None = None,
        network_to: str | None = None,
        amount: float | str | None = None,
        withdrawal_amount: float | str | None = None,
    ) -> Rate:
        """Quotes a fixed or floating rate.

        Pass amount (what you send) or withdrawal_amount (what you want to
        receive). Partner attribution is the API key, not a query field.

        Args:
            coin_from: Deposit currency code.
            coin_to: Payout currency code.
            rate_type: ``float`` or ``fixed``.
            network_from: Deposit network.
            network_to: Payout network.
            amount: Deposit amount.
            withdrawal_amount: Desired payout amount.

        Returns:
            Quote with amounts, rate, and limits.

        Examples:
            >>> quote = client.get_rate("BTC", "ETH", "float", amount="0.1")
        """
        params = _defined(
            {
                "coinFrom": coin_from,
                "networkFrom": network_from,
                "coinTo": coin_to,
                "networkTo": network_to,
                "amount": _amount(amount),
                "withdrawalAmount": _amount(withdrawal_amount),
                "rateType": rate_type,
            }
        )
        return self._request("GET", "/rate", params=params)

    def create_transaction(
        self,
        coin_from: str,
        coin_to: str,
        network_from: str,
        network_to: str,
        withdrawal_address: str,
        *,
        amount: float | str | None = None,
        withdrawal_amount: float | str | None = None,
        withdrawal_extra_id: str | None = None,
        rate_type: RateType | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        slippage: float | str | None = None,
    ) -> Transaction:
        """Creates an exchange and returns the deposit address.

        This opens a real swap. Call it only when a transaction should be created.

        Args:
            coin_from: Deposit currency code.
            coin_to: Payout currency code.
            network_from: Deposit network.
            network_to: Payout network.
            withdrawal_address: Address that receives the payout.
            amount: Deposit amount.
            withdrawal_amount: Desired payout amount.
            withdrawal_extra_id: Memo or extra id for the payout address.
            rate_type: ``float`` or ``fixed``. Defaults to float on the API.
            refund_address: Address used if the swap is refunded.
            refund_extra_id: Memo or extra id for the refund address.
            slippage: Allowed rate movement, percent. Requires a refund address.

        Returns:
            Created transaction, including the deposit address.

        Examples:
            >>> tx = client.create_transaction(
            ...     "ETH",
            ...     "USDT",
            ...     "ETH",
            ...     "ETH",
            ...     "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
            ...     amount=0.5,
            ...     rate_type="float",
            ... )
        """
        payload = _defined(
            {
                "coinFrom": coin_from,
                "networkFrom": network_from,
                "coinTo": coin_to,
                "networkTo": network_to,
                "amount": amount,
                "withdrawalAmount": withdrawal_amount,
                "withdrawalAddress": withdrawal_address,
                "withdrawalExtraId": withdrawal_extra_id,
                "rateType": rate_type,
                "refundAddress": refund_address,
                "refundExtraId": refund_extra_id,
                "slippage": slippage,
            }
        )
        return self._request("POST", "/transactions", json_data=payload)

    def get_transaction(self, transaction_id: str) -> Transaction:
        """Fetches one transaction by id.

        Args:
            transaction_id: Transaction id returned by create.

        Returns:
            Transaction status and addresses.

        Examples:
            >>> tx = client.get_transaction("ab93061434dd0s")
        """
        return self._request("GET", f"/transactions/{quote(transaction_id, safe='')}")

    def get_transactions(
        self,
        page: int | None = None,
        size: int | None = None,
        search: str | None = None,
        sort: str | None = None,
        order: SortOrder | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        statuses: str | list[str] | None = None,
    ) -> PaginatedTransactions:
        """Lists transaction history for the affiliate API key.

        Exolix enables this route per key. A rejected request means history is
        not activated for that key.

        Args:
            page: Page number.
            size: Page size.
            search: Transaction id filter.
            sort: Field to sort by.
            order: ``asc`` or ``desc``.
            date_from: Inclusive start datetime.
            date_to: Inclusive end datetime.
            statuses: One status or a list. A list is sent comma-separated.

        Returns:
            Page of transactions and the total count.

        Examples:
            >>> history = client.get_transactions(page=1, size=25, order="desc")
        """
        params = _defined(
            {
                "page": page,
                "size": size,
                "search": search,
                "sort": sort,
                "order": order,
                "dateFrom": date_from,
                "dateTo": date_to,
                "statuses": statuses,
            }
        )
        return self._request("GET", "/transactions", params=params or None)
