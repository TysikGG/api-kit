import os
import re
import time
from collections.abc import Callable, Mapping
from typing import Any
from urllib.parse import quote

import httpx

from .errors import (
    SimpleSwapError,
    SimpleSwapNetworkError,
    SimpleSwapRateLimitError,
    SimpleSwapTimeoutError,
    error_from_response,
    unwrap_payload,
)
from .types import (
    TERMINAL_EXCHANGE_STATUSES,
    CheckExchangeResult,
    EstimateResult,
    ExchangeOrder,
    MarketRate,
    RangesResult,
    SimpleSwapCurrency,
)

# Header that carries the partner API key.
# v3 attributes partner revenue through this header. Do not rename it.
SIMPLESWAP_API_KEY_HEADER = "x-api-key"

# Default User-Agent. Do not change this string; it is the client attribution token.
DEFAULT_USER_AGENT = "simpleswap-client/0.1.0"

DEFAULT_BASE_URL = "https://api.simpleswap.io"

_MAX_RETRY_DELAY = 60.0


def exchange_public_id(order: Mapping[str, Any] | None) -> str:
    """Reads ``publicId`` or ``id`` from an exchange payload."""
    if not order:
        raise SimpleSwapError("Exchange response did not include publicId or id")
    value = order.get("publicId") or order.get("id")
    if not value:
        raise SimpleSwapError("Exchange response did not include publicId or id")
    return str(value)


def _address_matches(address: str, pattern: str | None) -> bool:
    if address is None or str(address).strip() == "":
        return False
    if pattern is None or pattern == "":
        return True
    try:
        return re.fullmatch(pattern, address) is not None
    except re.error as exc:
        raise SimpleSwapError(f"Invalid address validation pattern: {exc}") from exc


def _path_id(value: str) -> str:
    return quote(str(value), safe="")


def _query_value(value: Any) -> Any:
    if isinstance(value, bool):
        return "true" if value else "false"
    return value


def _query(data: dict[str, Any]) -> dict[str, Any] | None:
    params: dict[str, Any] = {}
    for key, value in data.items():
        if value is None or value == "":
            continue
        params[key] = _query_value(value)
    return params or None


def _estimate_params(
    ticker_from: str,
    ticker_to: str,
    amount: float | str,
    network_from: str | None,
    network_to: str | None,
    fixed: bool | None,
    reverse: bool | None,
    custom_fee: float | str | None,
) -> dict[str, Any] | None:
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
        params["fixed"] = _query_value(fixed)
    if reverse is not None:
        params["reverse"] = _query_value(reverse)
    if custom_fee is not None:
        params["customFee"] = str(custom_fee)
    return params


def _range_params(
    ticker_from: str,
    ticker_to: str,
    network_from: str | None,
    network_to: str | None,
    fixed: bool | None,
    reverse: bool | None,
) -> dict[str, Any] | None:
    params: dict[str, Any] = {
        "tickerFrom": ticker_from,
        "tickerTo": ticker_to,
    }
    if network_from is not None:
        params["networkFrom"] = network_from
    if network_to is not None:
        params["networkTo"] = network_to
    if fixed is not None:
        params["fixed"] = _query_value(fixed)
    if reverse is not None:
        params["reverse"] = _query_value(reverse)
    return params


def _check_params(
    ticker_from: str,
    ticker_to: str,
    amount: float | str,
    network_from: str | None,
    network_to: str | None,
    fixed: bool | None,
    reverse: bool | None,
) -> dict[str, Any] | None:
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
        params["fixed"] = _query_value(fixed)
    if reverse is not None:
        params["reverse"] = _query_value(reverse)
    return params


def _create_payload(
    ticker_from: str,
    ticker_to: str,
    amount: float | str,
    address_to: str,
    network_from: str | None,
    network_to: str | None,
    fixed: bool | None,
    reverse: bool | None,
    extra_id_to: str | None,
    user_refund_address: str | None,
    user_refund_extra_id: str | None,
    rate_id: str | None,
    custom_fee: float | str | None,
) -> dict[str, Any]:
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
    if reverse is not None:
        payload["reverse"] = reverse
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
    return payload


def _confirm_payload(
    public_id: str,
    tx_from: str | None,
    provider_user_deposit_address: str | None,
    target_address: str | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"publicId": public_id}
    if tx_from is not None:
        payload["txFrom"] = tx_from
    if provider_user_deposit_address is not None:
        payload["providerUserDepositAddress"] = provider_user_deposit_address
    if target_address is not None:
        payload["targetAddress"] = target_address
    return payload


def _pairs_path(ticker: str | None, network: str | None) -> str:
    if (ticker is None) ^ (network is None):
        raise SimpleSwapError(
            "get_pairs requires both ticker and network, or neither for all pairs"
        )
    if ticker is None or network is None:
        return "/v3/pairs"
    return f"/v3/pairs/{_path_id(ticker)}/{_path_id(network)}"


def _normalize_check(result: Any) -> CheckExchangeResult:
    if isinstance(result, bool):
        return {"canCreate": result}
    return result


def _min_from_ranges(ranges: Any) -> str | None:
    if isinstance(ranges, dict):
        return ranges.get("min")
    return None


class _Config:
    def __init__(
        self,
        api_key: str | None,
        base_url: str | None,
        timeout: float,
        user_agent: str | None,
        client_ip: str | None,
        proxy: str | None,
        max_retries: int,
        retry_delay: float,
        polling_interval: float,
        polling_timeout: float,
        trust_env: bool,
    ) -> None:
        self.api_key = api_key or os.environ.get("SIMPLESWAP_API_KEY")
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout
        self.user_agent = user_agent or DEFAULT_USER_AGENT
        self.client_ip = client_ip
        self.proxy = proxy
        self.max_retries = max(0, max_retries)
        self.retry_delay = max(0.0, retry_delay)
        self.polling_interval = max(0.0, polling_interval)
        self.polling_timeout = max(0.0, polling_timeout)
        self.trust_env = trust_env

    def headers(self) -> dict[str, str]:
        headers = {
            "User-Agent": self.user_agent,
            "x-user-agent": self.user_agent,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers[SIMPLESWAP_API_KEY_HEADER] = self.api_key
        if self.client_ip:
            headers["x-client-ip"] = self.client_ip
        return headers

    def client_kwargs(self) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "base_url": self.base_url,
            "timeout": self.timeout,
            "headers": self.headers(),
        }
        if self.proxy:
            kwargs["proxy"] = self.proxy
        if not self.trust_env:
            kwargs["trust_env"] = False
        return kwargs


def _should_retry(method: str, error: SimpleSwapError) -> bool:
    if not error.retryable:
        return False
    if method.upper() == "GET":
        return True
    return isinstance(error, SimpleSwapRateLimitError) or error.status_code == 429


def _decode(response: httpx.Response) -> Any:
    if response.status_code >= 400:
        try:
            data = response.json()
        except Exception:
            data = response.text or None
        raise error_from_response(response.status_code, data, headers=response.headers)
    if not response.content:
        return None
    try:
        data = response.json()
    except Exception as exc:
        raise SimpleSwapError("Invalid JSON response", status_code=response.status_code) from exc
    return unwrap_payload(data, response.status_code)


def _retry_delay(error: SimpleSwapError, configured: float, attempt: int) -> float:
    if error.retry_after is not None:
        preferred = error.retry_after
    else:
        preferred = configured * (2**attempt)
    return min(max(0.0, preferred), _MAX_RETRY_DELAY)


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
        *,
        client_ip: str | None = None,
        proxy: str | None = None,
        max_retries: int = 2,
        retry_delay: float = 0.2,
        polling_interval: float = 5.0,
        polling_timeout: float = 600.0,
        trust_env: bool = True,
    ) -> None:
        """Initializes the SimpleSwap client.

        Args:
            api_key: SimpleSwap API key. Defaults to SIMPLESWAP_API_KEY.
            base_url: Base URL for the SimpleSwap API. Defaults to https://api.simpleswap.io.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string. The default is simpleswap-client/0.1.0.
            client_ip: End-user IP forwarded as ``x-client-ip``.
            proxy: Proxy URL passed to httpx.
            max_retries: Extra attempts after a retryable failure. Defaults to 2.
            retry_delay: Base retry delay in seconds. Doubles each attempt.
            polling_interval: Default ``wait_for_exchange`` interval in seconds.
            polling_timeout: Default ``wait_for_exchange`` timeout in seconds.
            trust_env: When false, ignore proxy environment variables.

        Examples:
            >>> from simpleswap import SimpleSwap
            >>> client = SimpleSwap(api_key="your-api-key")
            >>> currencies = client.get_currencies()
            >>> print(len(currencies))
        """
        cfg = _Config(
            api_key,
            base_url,
            timeout,
            user_agent,
            client_ip,
            proxy,
            max_retries,
            retry_delay,
            polling_interval,
            polling_timeout,
            trust_env,
        )
        self.api_key = cfg.api_key
        self.base_url = cfg.base_url
        self._cfg = cfg
        self._client = httpx.Client(**cfg.client_kwargs())

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
        attempt = 0
        while True:
            try:
                response = self._client.request(method, path, params=params, json=json_data)
                return _decode(response)
            except httpx.RequestError as exc:
                error: SimpleSwapError = SimpleSwapNetworkError(f"HTTP request failed: {exc}")
            except SimpleSwapError as exc:
                error = exc
            attempt += 1
            if not _should_retry(method, error) or attempt > self._cfg.max_retries:
                raise error
            time.sleep(_retry_delay(error, self._cfg.retry_delay, attempt - 1))

    def is_valid_address(
        self,
        address: str,
        pattern: str | None = None,
        *,
        currency: SimpleSwapCurrency | None = None,
    ) -> bool:
        """Returns true when ``address`` matches a currency validation regex."""
        chosen = pattern
        if currency is not None:
            chosen = currency.get("validationAddress")
        return _address_matches(address, chosen)

    def get_currencies(self) -> list[SimpleSwapCurrency]:
        """Retrieves all supported cryptocurrencies and fiat currencies."""
        return self._request("GET", "/v3/currencies")

    def get_all_currencies(self) -> list[SimpleSwapCurrency]:
        """Alias of :meth:`get_currencies`."""
        return self.get_currencies()

    def get_currency(self, ticker: str, network: str) -> SimpleSwapCurrency:
        """Retrieves details for a specific currency and network."""
        return self._request("GET", f"/v3/currencies/{_path_id(ticker)}/{_path_id(network)}")

    def get_pairs(
        self,
        ticker: str | None = None,
        network: str | None = None,
        fixed: bool | None = None,
    ) -> dict[str, list[str]]:
        """Lists all pairs, or the destinations for one ticker and network."""
        return self._request("GET", _pairs_path(ticker, network), params=_query({"fixed": fixed}))

    def get_all_pairs(self, fixed: bool | None = None) -> dict[str, list[str]]:
        """Alias of :meth:`get_pairs` with no ticker."""
        return self.get_pairs(fixed=fixed)

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
        """Retrieves estimated receiving amount for an exchange."""
        return self._request(
            "GET",
            "/v3/estimates",
            params=_estimate_params(
                ticker_from,
                ticker_to,
                amount,
                network_from,
                network_to,
                fixed,
                reverse,
                custom_fee,
            ),
        )

    def get_estimated(
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
        """Alias of :meth:`get_estimate` for the legacy ``get_estimated`` name."""
        return self.get_estimate(
            ticker_from,
            ticker_to,
            amount,
            network_from,
            network_to,
            fixed,
            reverse,
            custom_fee,
        )

    def get_ranges(
        self,
        ticker_from: str,
        ticker_to: str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
    ) -> RangesResult:
        """Retrieves deposit bounds (minimum and maximum amounts)."""
        return self._request(
            "GET",
            "/v3/ranges",
            params=_range_params(ticker_from, ticker_to, network_from, network_to, fixed, reverse),
        )

    def get_min(
        self,
        ticker_from: str,
        ticker_to: str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
    ) -> str | None:
        """Legacy helper. Returns the minimum deposit from :meth:`get_ranges`."""
        return _min_from_ranges(
            self.get_ranges(ticker_from, ticker_to, network_from, network_to, fixed, reverse)
        )

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
        """Checks if an exchange can be created for the pair and amount."""
        result = self._request(
            "GET",
            "/v3/exchanges/check",
            params=_check_params(
                ticker_from, ticker_to, amount, network_from, network_to, fixed, reverse
            ),
        )
        return _normalize_check(result)

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
        reverse: bool | None = None,
    ) -> ExchangeOrder:
        """Creates a cryptocurrency exchange order."""
        return self._request(
            "POST",
            "/v3/exchanges",
            json_data=_create_payload(
                ticker_from,
                ticker_to,
                amount,
                address_to,
                network_from,
                network_to,
                fixed,
                reverse,
                extra_id_to,
                user_refund_address,
                user_refund_extra_id,
                rate_id,
                custom_fee,
            ),
        )

    def confirm_exchange(
        self,
        public_id: str,
        tx_from: str | None = None,
        provider_user_deposit_address: str | None = None,
        target_address: str | None = None,
    ) -> ExchangeOrder:
        """Confirms a provider-side deposit (``PUT /v3/exchanges``)."""
        return self._request(
            "PUT",
            "/v3/exchanges",
            json_data=_confirm_payload(
                public_id, tx_from, provider_user_deposit_address, target_address
            ),
        )

    def get_exchange(self, exchange_id: str) -> ExchangeOrder:
        """Retrieves details of an exchange order by public id."""
        return self._request("GET", f"/v3/exchanges/{_path_id(exchange_id)}")

    def wait_for_exchange(
        self,
        exchange_id: str,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        statuses: set[str] | frozenset[str] | None = None,
        on_update: Callable[[ExchangeOrder], None] | None = None,
    ) -> ExchangeOrder:
        """Polls :meth:`get_exchange` until the status matches or the timeout elapses."""
        limit = self._cfg.polling_timeout if timeout is None else timeout
        pause = self._cfg.polling_interval if interval is None else interval
        wanted = TERMINAL_EXCHANGE_STATUSES if statuses is None else set(statuses)
        started = time.monotonic()
        last: ExchangeOrder | None = None
        while True:
            order = self.get_exchange(exchange_id)
            last = order
            if on_update is not None:
                on_update(order)
            status = str(order.get("status", "")) if isinstance(order, dict) else ""
            if status in wanted:
                return order
            if time.monotonic() - started >= limit:
                shown = status or "unknown"
                raise SimpleSwapTimeoutError(
                    f"Timed out waiting for exchange {exchange_id} (last status: {shown})",
                    response_body=last,
                )
            time.sleep(max(0.0, pause))

    def get_exchanges(
        self,
        limit: int | None = None,
        offset: int | None = None,
        start_date: str | None = None,
        finish_date: str | None = None,
    ) -> list[ExchangeOrder]:
        """Lists previous exchange orders."""
        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        if start_date is not None:
            params["startDate"] = start_date
        if finish_date is not None:
            params["finishDate"] = finish_date
        return self._request("GET", "/v3/exchanges", params=params or None)

    def get_market(self) -> list[MarketRate]:
        """Fixed-rate market table (``GET /v3/market``)."""
        return self._request("GET", "/v3/market")

    def get_market_info(self) -> list[MarketRate]:
        """Alias of :meth:`get_market`."""
        return self.get_market()


class AsyncSimpleSwap:
    """Async client for the SimpleSwap cryptocurrency exchange API (v3)."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
        *,
        client_ip: str | None = None,
        proxy: str | None = None,
        max_retries: int = 2,
        retry_delay: float = 0.2,
        polling_interval: float = 5.0,
        polling_timeout: float = 600.0,
        trust_env: bool = True,
    ) -> None:
        cfg = _Config(
            api_key,
            base_url,
            timeout,
            user_agent,
            client_ip,
            proxy,
            max_retries,
            retry_delay,
            polling_interval,
            polling_timeout,
            trust_env,
        )
        self.api_key = cfg.api_key
        self.base_url = cfg.base_url
        self._cfg = cfg
        self._client = httpx.AsyncClient(**cfg.client_kwargs())

    async def close(self) -> None:
        """Closes the underlying HTTP client session."""
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncSimpleSwap":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
    ) -> Any:
        import asyncio

        attempt = 0
        while True:
            try:
                response = await self._client.request(method, path, params=params, json=json_data)
                return _decode(response)
            except httpx.RequestError as exc:
                error: SimpleSwapError = SimpleSwapNetworkError(f"HTTP request failed: {exc}")
            except SimpleSwapError as exc:
                error = exc
            attempt += 1
            if not _should_retry(method, error) or attempt > self._cfg.max_retries:
                raise error
            await asyncio.sleep(_retry_delay(error, self._cfg.retry_delay, attempt - 1))

    def is_valid_address(
        self,
        address: str,
        pattern: str | None = None,
        *,
        currency: SimpleSwapCurrency | None = None,
    ) -> bool:
        """Returns true when ``address`` matches a currency validation regex."""
        chosen = pattern
        if currency is not None:
            chosen = currency.get("validationAddress")
        return _address_matches(address, chosen)

    async def get_currencies(self) -> list[SimpleSwapCurrency]:
        """Retrieves all supported cryptocurrencies and fiat currencies."""
        return await self._request("GET", "/v3/currencies")

    async def get_all_currencies(self) -> list[SimpleSwapCurrency]:
        """Alias of :meth:`get_currencies`."""
        return await self.get_currencies()

    async def get_currency(self, ticker: str, network: str) -> SimpleSwapCurrency:
        """Retrieves details for a specific currency and network."""
        return await self._request("GET", f"/v3/currencies/{_path_id(ticker)}/{_path_id(network)}")

    async def get_pairs(
        self,
        ticker: str | None = None,
        network: str | None = None,
        fixed: bool | None = None,
    ) -> dict[str, list[str]]:
        """Lists all pairs, or the destinations for one ticker and network."""
        return await self._request(
            "GET", _pairs_path(ticker, network), params=_query({"fixed": fixed})
        )

    async def get_all_pairs(self, fixed: bool | None = None) -> dict[str, list[str]]:
        """Alias of :meth:`get_pairs` with no ticker."""
        return await self.get_pairs(fixed=fixed)

    async def get_estimate(
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
        """Retrieves estimated receiving amount for an exchange."""
        return await self._request(
            "GET",
            "/v3/estimates",
            params=_estimate_params(
                ticker_from,
                ticker_to,
                amount,
                network_from,
                network_to,
                fixed,
                reverse,
                custom_fee,
            ),
        )

    async def get_estimated(
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
        """Alias of :meth:`get_estimate`."""
        return await self.get_estimate(
            ticker_from,
            ticker_to,
            amount,
            network_from,
            network_to,
            fixed,
            reverse,
            custom_fee,
        )

    async def get_ranges(
        self,
        ticker_from: str,
        ticker_to: str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
    ) -> RangesResult:
        """Retrieves deposit bounds (minimum and maximum amounts)."""
        return await self._request(
            "GET",
            "/v3/ranges",
            params=_range_params(ticker_from, ticker_to, network_from, network_to, fixed, reverse),
        )

    async def get_min(
        self,
        ticker_from: str,
        ticker_to: str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
    ) -> str | None:
        """Legacy helper. Returns the minimum deposit from :meth:`get_ranges`."""
        return _min_from_ranges(
            await self.get_ranges(ticker_from, ticker_to, network_from, network_to, fixed, reverse)
        )

    async def check_exchange(
        self,
        ticker_from: str,
        ticker_to: str,
        amount: float | str,
        network_from: str | None = None,
        network_to: str | None = None,
        fixed: bool | None = None,
        reverse: bool | None = None,
    ) -> CheckExchangeResult:
        """Checks if an exchange can be created for the pair and amount."""
        result = await self._request(
            "GET",
            "/v3/exchanges/check",
            params=_check_params(
                ticker_from, ticker_to, amount, network_from, network_to, fixed, reverse
            ),
        )
        return _normalize_check(result)

    async def create_exchange(
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
        reverse: bool | None = None,
    ) -> ExchangeOrder:
        """Creates a cryptocurrency exchange order."""
        return await self._request(
            "POST",
            "/v3/exchanges",
            json_data=_create_payload(
                ticker_from,
                ticker_to,
                amount,
                address_to,
                network_from,
                network_to,
                fixed,
                reverse,
                extra_id_to,
                user_refund_address,
                user_refund_extra_id,
                rate_id,
                custom_fee,
            ),
        )

    async def confirm_exchange(
        self,
        public_id: str,
        tx_from: str | None = None,
        provider_user_deposit_address: str | None = None,
        target_address: str | None = None,
    ) -> ExchangeOrder:
        """Confirms a provider-side deposit (``PUT /v3/exchanges``)."""
        return await self._request(
            "PUT",
            "/v3/exchanges",
            json_data=_confirm_payload(
                public_id, tx_from, provider_user_deposit_address, target_address
            ),
        )

    async def get_exchange(self, exchange_id: str) -> ExchangeOrder:
        """Retrieves details of an exchange order by public id."""
        return await self._request("GET", f"/v3/exchanges/{_path_id(exchange_id)}")

    async def wait_for_exchange(
        self,
        exchange_id: str,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        statuses: set[str] | frozenset[str] | None = None,
        on_update: Callable[[ExchangeOrder], None] | None = None,
    ) -> ExchangeOrder:
        """Polls :meth:`get_exchange` until the status matches or the timeout elapses."""
        import asyncio

        limit = self._cfg.polling_timeout if timeout is None else timeout
        pause = self._cfg.polling_interval if interval is None else interval
        wanted = TERMINAL_EXCHANGE_STATUSES if statuses is None else set(statuses)
        started = time.monotonic()
        last: ExchangeOrder | None = None
        while True:
            order = await self.get_exchange(exchange_id)
            last = order
            if on_update is not None:
                on_update(order)
            status = str(order.get("status", "")) if isinstance(order, dict) else ""
            if status in wanted:
                return order
            if time.monotonic() - started >= limit:
                shown = status or "unknown"
                raise SimpleSwapTimeoutError(
                    f"Timed out waiting for exchange {exchange_id} (last status: {shown})",
                    response_body=last,
                )
            await asyncio.sleep(max(0.0, pause))

    async def get_exchanges(
        self,
        limit: int | None = None,
        offset: int | None = None,
        start_date: str | None = None,
        finish_date: str | None = None,
    ) -> list[ExchangeOrder]:
        """Lists previous exchange orders."""
        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        if start_date is not None:
            params["startDate"] = start_date
        if finish_date is not None:
            params["finishDate"] = finish_date
        return await self._request("GET", "/v3/exchanges", params=params or None)

    async def get_market(self) -> list[MarketRate]:
        """Fixed-rate market table (``GET /v3/market``)."""
        return await self._request("GET", "/v3/market")

    async def get_market_info(self) -> list[MarketRate]:
        """Alias of :meth:`get_market`."""
        return await self.get_market()
