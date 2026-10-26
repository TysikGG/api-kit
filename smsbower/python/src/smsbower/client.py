"""SMSBower API client implementation."""

import json
from typing import Any

import httpx

from .errors import SmsBowerError
from .types import ActivationNumber, ActivationStatus, CountryItem, ServiceItem

DEFAULT_REF_ID = "572438"
DEFAULT_BASE_URL = "https://smsbower.page"


class SmsBowerClient:
    """Client for communicating with the SMSBower activation API.

    Args:
        api_key: SMSBower API key.
        base_url: Base URL of the API. Defaults to https://smsbower.page.
        timeout: HTTP request timeout in seconds. Defaults to 30.0.

    Examples:
        >>> from smsbower import SmsBowerClient
        >>> client = SmsBowerClient(api_key="your_token")
        >>> balance = client.get_balance()
        >>> print(balance)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise SmsBowerError("api_key is required to initialize SmsBowerClient")
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout)

    def __enter__(self) -> "SmsBowerClient":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def get_balance(self) -> float:
        """Retrieves the current account balance.

        Returns:
            The account balance as a float.

        Raises:
            SmsBowerError: If the server returns an error or unexpected response.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> balance = client.get_balance()
            >>> print(f"Balance: {balance}")
        """
        data = self._send_handler_request({"action": "getBalance"})
        if isinstance(data, str) and data.startswith("ACCESS_BALANCE:"):
            try:
                return float(data.split(":", 1)[1])
            except ValueError as exc:
                raise SmsBowerError(f"Failed to parse balance: {data}", "PARSE_ERROR") from exc
        raise SmsBowerError(f"Unexpected getBalance response: {data}", "INVALID_RESPONSE", data)

    def get_number(
        self,
        service: str,
        country: str | int | None = None,
        max_price: float | None = None,
        min_price: float | None = None,
        provider_ids: str | list[str | int] | None = None,
        except_provider_ids: str | list[str | int] | None = None,
        phone_exception: str | None = None,
        user_id: str | int | None = None,
    ) -> ActivationNumber:
        """Orders a virtual phone number for SMS verification.

        Args:
            service: Service code (e.g. 'tg', 'wa').
            country: Country code or ID (e.g. '22').
            max_price: Maximum price willing to pay.
            min_price: Minimum price willing to pay.
            provider_ids: Provider IDs whitelist.
            except_provider_ids: Provider IDs blacklist.
            phone_exception: Phone prefix exception filters.
            user_id: Reseller user identifier.

        Returns:
            ActivationNumber with ID and phone number.

        Raises:
            SmsBowerError: If no numbers are available or an API error occurs.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> number = client.get_number("tg", country="22")
            >>> print(f"ID: {number.id}, Number: {number.number}")
        """
        params: dict[str, Any] = {
            "action": "getNumber",
            "service": service,
            "ref": DEFAULT_REF_ID,
        }
        if country is not None:
            params["country"] = country
        if max_price is not None:
            params["maxPrice"] = max_price
        if min_price is not None:
            params["minPrice"] = min_price
        if provider_ids is not None:
            params["providerIds"] = (
                ",".join(map(str, provider_ids)) if isinstance(provider_ids, list) else provider_ids
            )
        if except_provider_ids is not None:
            params["exceptProviderIds"] = (
                ",".join(map(str, except_provider_ids))
                if isinstance(except_provider_ids, list)
                else except_provider_ids
            )
        if phone_exception is not None:
            params["phoneException"] = phone_exception
        if user_id is not None:
            params["userID"] = user_id

        data = self._send_handler_request(params)
        if isinstance(data, str) and data.startswith("ACCESS_NUMBER:"):
            parts = data.split(":")
            if len(parts) >= 3:
                return ActivationNumber(id=parts[1], number=parts[2])
        raise SmsBowerError(f"Unexpected getNumber response: {data}", "INVALID_RESPONSE", data)

    def get_number_v2(
        self,
        service: str,
        country: str | int | None = None,
        max_price: float | None = None,
        min_price: float | None = None,
        provider_ids: str | list[str | int] | None = None,
        except_provider_ids: str | list[str | int] | None = None,
        phone_exception: str | None = None,
        user_id: str | int | None = None,
    ) -> dict[str, Any]:
        """Orders a virtual phone number with rich metadata (v2 protocol).

        Args:
            service: Service code.
            country: Country code or ID.
            max_price: Maximum price willing to pay.
            min_price: Minimum price willing to pay.
            provider_ids: Provider IDs whitelist.
            except_provider_ids: Provider IDs blacklist.
            phone_exception: Phone prefix exception filters.
            user_id: Reseller user identifier.

        Returns:
            Dictionary with full activation details.

        Raises:
            SmsBowerError: If order fails or returns an API error.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> order = client.get_number_v2("tg", country="22")
            >>> print(order["phoneNumber"], order.get("activationCost"))
        """
        params: dict[str, Any] = {
            "action": "getNumberV2",
            "service": service,
            "ref": DEFAULT_REF_ID,
        }
        if country is not None:
            params["country"] = country
        if max_price is not None:
            params["maxPrice"] = max_price
        if min_price is not None:
            params["minPrice"] = min_price
        if provider_ids is not None:
            params["providerIds"] = (
                ",".join(map(str, provider_ids)) if isinstance(provider_ids, list) else provider_ids
            )
        if except_provider_ids is not None:
            params["exceptProviderIds"] = (
                ",".join(map(str, except_provider_ids))
                if isinstance(except_provider_ids, list)
                else except_provider_ids
            )
        if phone_exception is not None:
            params["phoneException"] = phone_exception
        if user_id is not None:
            params["userID"] = user_id

        data = self._send_handler_request(params)
        if isinstance(data, dict):
            return data
        if isinstance(data, str):
            try:
                parsed = json.loads(data)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
        raise SmsBowerError(f"Unexpected getNumberV2 response: {data}", "INVALID_RESPONSE", data)

    def get_status(self, activation_id: str | int) -> ActivationStatus:
        """Retrieves the status and SMS code of an activation.

        Args:
            activation_id: Unique activation ID.

        Returns:
            ActivationStatus object with status and optional code.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> status = client.get_status("123456")
            >>> if status.status == "STATUS_OK":
            ...     print("Code:", status.code)
        """
        data = self._send_handler_request({"action": "getStatus", "id": activation_id})
        if isinstance(data, str):
            if data.startswith("STATUS_OK:"):
                return ActivationStatus(status="STATUS_OK", code=data.split(":", 1)[1].strip())
            if data.startswith("STATUS_WAIT_RETRY:"):
                return ActivationStatus(
                    status="STATUS_WAIT_RETRY", code=data.split(":", 1)[1].strip()
                )
            return ActivationStatus(status=data.strip())
        raise SmsBowerError(f"Unexpected getStatus response: {data}", "INVALID_RESPONSE", data)

    def set_status(self, activation_id: str | int, status: int) -> str:
        """Changes activation lifecycle status.

        Status codes:
            1: SMS sent / number ready
            3: Request another code
            6: Complete activation
            8: Cancel activation

        Args:
            activation_id: Unique activation ID.
            status: Status code number.

        Returns:
            Server response code string.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> client.set_status("123456", 6)
            'ACCESS_ACTIVATION'
        """
        data = self._send_handler_request(
            {
                "action": "setStatus",
                "id": activation_id,
                "status": status,
            }
        )
        return str(data).strip()

    def get_prices(
        self,
        service: str | None = None,
        country: str | int | None = None,
    ) -> dict[str, Any]:
        """Retrieves the standard service price catalog.

        Args:
            service: Optional service code filter.
            country: Optional country ID filter.

        Returns:
            Nested dictionary of prices and counts.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> prices = client.get_prices("tg", "22")
            >>> print(prices)
        """
        params: dict[str, Any] = {"action": "getPrices"}
        if service:
            params["service"] = service
        if country is not None:
            params["country"] = country
        data = self._send_handler_request(params)
        return data if isinstance(data, dict) else {}

    def get_prices_v2(
        self,
        service: str | None = None,
        country: str | int | None = None,
    ) -> dict[str, Any]:
        """Retrieves detailed price list grouped by price points.

        Args:
            service: Optional service code filter.
            country: Optional country ID filter.

        Returns:
            Price mapping dictionary.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> v2_prices = client.get_prices_v2("tg", "22")
        """
        params: dict[str, Any] = {"action": "getPricesV2"}
        if service:
            params["service"] = service
        if country is not None:
            params["country"] = country
        data = self._send_handler_request(params)
        return data if isinstance(data, dict) else {}

    def get_prices_v3(
        self,
        service: str | None = None,
        country: str | int | None = None,
    ) -> dict[str, Any]:
        """Retrieves granular provider-level price list.

        Args:
            service: Optional service code filter.
            country: Optional country ID filter.

        Returns:
            Provider price mapping.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> v3_prices = client.get_prices_v3("tg", "22")
        """
        params: dict[str, Any] = {"action": "getPricesV3"}
        if service:
            params["service"] = service
        if country is not None:
            params["country"] = country
        data = self._send_handler_request(params)
        return data if isinstance(data, dict) else {}

    def get_services_list(self) -> list[ServiceItem]:
        """Retrieves all supported services.

        Returns:
            List of ServiceItem objects.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> services = client.get_services_list()
            >>> print(f"Supported services: {len(services)}")
        """
        data = self._send_handler_request({"action": "getServicesList"})
        if isinstance(data, dict) and "services" in data and isinstance(data["services"], list):
            return [
                ServiceItem(code=item.get("code", ""), name=item.get("name", ""))
                for item in data["services"]
            ]
        if isinstance(data, list):
            return [
                ServiceItem(code=item.get("code", ""), name=item.get("name", "")) for item in data
            ]
        return []

    def get_countries(self) -> dict[str, CountryItem]:
        """Retrieves all available countries.

        Returns:
            Dictionary mapping country IDs to CountryItem objects.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> countries = client.get_countries()
            >>> print(countries["22"].eng)
        """
        data = self._send_handler_request({"action": "getCountries"})
        countries: dict[str, CountryItem] = {}
        if isinstance(data, dict):
            for cid, val in data.items():
                if isinstance(val, dict):
                    countries[str(cid)] = CountryItem(
                        id=str(val.get("id", cid)),
                        rus=val.get("rus"),
                        eng=val.get("eng"),
                        chn=val.get("chn"),
                    )
        return countries

    def get_top_countries_by_service(self, service: str) -> dict[str, Any]:
        """Retrieves top 10 countries and gold partners for a service.

        Args:
            service: Service code.

        Returns:
            Dictionary of top countries and partners.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> top = client.get_top_countries_by_service("tg")
        """
        data = self._send_handler_request(
            {
                "action": "getTopCountriesByService",
                "service": service,
            }
        )
        return data if isinstance(data, dict) else {}

    def get_actual_wallet_address(self, coin: str, network: str) -> str:
        """Retrieves static crypto deposit address.

        Args:
            coin: Cryptocurrency symbol (e.g. 'usdt', 'trx').
            network: Blockchain network (e.g. 'tron').

        Returns:
            Wallet deposit address string.

        Raises:
            SmsBowerError: If request fails.

        Examples:
            >>> client = SmsBowerClient(api_key="key")
            >>> addr = client.get_actual_wallet_address("usdt", "tron")
            >>> print("Deposit address:", addr)
        """
        try:
            resp = self._client.get(
                "/api/payment/getActualWalletAddress",
                params={
                    "api_key": self.api_key,
                    "coin": coin,
                    "network": network,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and "wallet_address" in data:
                return str(data["wallet_address"])
            raise SmsBowerError(f"Unexpected wallet response: {resp.text}", "INVALID_RESPONSE")
        except httpx.HTTPError as exc:
            raise SmsBowerError(f"Wallet request failed: {exc}", "NETWORK_ERROR") from exc

    def _send_handler_request(self, params: dict[str, Any]) -> Any:
        query = {"api_key": self.api_key, **params}
        try:
            resp = self._client.get("/stubs/handler_api.php", params=query)
            resp.raise_for_status()
            text = resp.text.strip()

            error_keywords = [
                "BAD_KEY",
                "BAD_ACTION",
                "BAD_SERVICE",
                "NO_NUMBERS",
                "NO_BALANCE",
                "NO_ACTIVATION",
                "BAD_STATUS",
                "EARLY_CANCEL_DENIED",
                "BAD_COUNTRY",
            ]
            for kw in error_keywords:
                if text == kw or text.startswith(f"{kw}:"):
                    raise SmsBowerError(f"SMSBower API error: {text}", code=kw, response_body=text)

            if (text.startswith("{") and text.endswith("}")) or (
                text.startswith("[") and text.endswith("]")
            ):
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    pass

            return text
        except httpx.HTTPError as exc:
            raise SmsBowerError(f"HTTP request failed: {exc}", "NETWORK_ERROR") from exc
