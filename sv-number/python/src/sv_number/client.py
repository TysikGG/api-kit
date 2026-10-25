"""Client for the SV Number SMS verification API."""

from __future__ import annotations

import time
from collections.abc import Mapping
from typing import Any

import httpx

from .errors import SvNumberError, assert_not_api_error
from .parse import parse_access_number, parse_balance, parse_status
from .types import ActivationStatus, OrderedNumber, ServiceCostItem

_DEFAULT_BASE_URL = "https://sms-verification-number.com"
_DEFAULT_TIMEOUT = 30.0

REF_KEY = "226"


class SvNumber:
    """Client for the SV Number SMS verification service.

    Args:
        api_key: SV Number API key.
        base_url: Custom API base URL (defaults to `https://sms-verification-number.com`).
        timeout: Request timeout in seconds (defaults to 30.0).
        lang: Language preference (e.g. `en`, `ru`).

    Examples:
        >>> from sv_number import SvNumber
        >>> with SvNumber("your_api_key") as client:
        ...     balance = client.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
        lang: str = "en",
    ) -> None:
        if not api_key or not api_key.strip():
            raise SvNumberError("BAD_KEY", "API key is required")

        self._api_key = api_key.strip()
        self._lang = lang
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={
                "Accept": "application/json, text/plain",
            },
        )

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> SvNumber:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def call(self, action: str, params: Mapping[str, Any] | None = None) -> Any:
        """Execute a low-level call to /stubs/handler_api.

        Automatically attaches ``api_key``, ``ref_key``, and ``lang``.
        """
        query: dict[str, str] = {
            "api_key": self._api_key,
            "ref_key": REF_KEY,
            "lang": self._lang,
            "action": action,
        }

        if params:
            for key, val in params.items():
                if val is not None and val != "":
                    query[key] = str(val)

        try:
            res = self._http.get("/stubs/handler_api", params=query)
        except httpx.HTTPError as err:
            raise SvNumberError("NETWORK", str(err)) from err

        if res.is_error:
            raise SvNumberError(f"HTTP_{res.status_code}", res.text)

        # Attempt to parse json, otherwise return text
        try:
            data = res.json()
        except ValueError:
            data = res.text

        assert_not_api_error(data)
        return data

    def get_balance(self) -> float:
        """Retrieve current balance in USD.

        Returns:
            Balance amount.

        Examples:
            >>> with SvNumber("key") as client:
            ...     print(client.get_balance())
        """
        data = self.call("getBalance")
        return parse_balance(data)

    def get_number(
        self,
        service: str,
        *,
        country: str | int = 0,
        operator: str | None = None,
    ) -> OrderedNumber:
        """Rent a temporary phone number.

        Args:
            service: Service identifier (e.g. ``wa``, ``tg``).
            country: Country code or ID (defaults to 0).
            operator: Specific mobile operator name.

        Returns:
            Dictionary with ``activation_id`` and ``phone_number``.

        Examples:
            >>> with SvNumber("key") as client:
            ...     order = client.get_number("wa", country=0)
            ...     print(order["phone_number"])
        """
        params: dict[str, Any] = {"service": service, "country": country}
        if operator:
            params["operator"] = operator

        data = self.call("getNumber", params)
        return parse_access_number(str(data))

    def get_status(self, activation_id: str | int) -> ActivationStatus:
        """Check current status of an activation.

        Args:
            activation_id: Activation ID.

        Returns:
            Dictionary with ``status`` (and optional ``code``).

        Examples:
            >>> with SvNumber("key") as client:
            ...     status = client.get_status(activation_id)
        """
        data = self.call("getStatus", {"id": activation_id})
        return parse_status(str(data))

    def set_status(self, activation_id: str | int, status: int) -> str:
        """Update activation status.

        Args:
            activation_id: Activation ID.
            status: Status integer (1 = ready, 6 = complete, 8 = cancel).
        """
        data = self.call("setStatus", {"id": activation_id, "status": status})
        return str(data)

    def ready(self, activation_id: str | int) -> str:
        """Signal that the SMS has been requested (status=1)."""
        return self.set_status(activation_id, 1)

    def complete(self, activation_id: str | int) -> str:
        """Finish the activation successfully (status=6)."""
        return self.set_status(activation_id, 6)

    def cancel(self, activation_id: str | int) -> str:
        """Cancel the activation (status=8)."""
        return self.set_status(activation_id, 8)

    def wait_for_code(
        self,
        activation_id: str | int,
        *,
        timeout: float = 120.0,
        interval: float = 3.0,
    ) -> str:
        """Poll get_status until an SMS code arrives or timeout expires.

        Args:
            activation_id: Activation ID.
            timeout: Maximum wait time in seconds (defaults to 120.0).
            interval: Delay between checks in seconds (defaults to 3.0).

        Returns:
            Extracted verification code string.
        """
        start_time = time.monotonic()

        while True:
            res = self.get_status(activation_id)
            if res.get("status") == "STATUS_OK" and res.get("code"):
                return res["code"]

            if res.get("status") == "STATUS_CANCEL":
                raise SvNumberError("STATUS_CANCEL", "Activation cancelled")

            if time.monotonic() - start_time >= timeout:
                raise SvNumberError("TIMEOUT", "Timed out waiting for SMS code")

            time.sleep(interval)

    def get_prices(self, country: str | int | None = None) -> dict[str, Any]:
        """Fetch price matrix grouped by country and service."""
        params = {"country": country} if country is not None else {}
        data = self.call("getPrices", params)
        return data if isinstance(data, dict) else {}

    def get_services_and_cost(
        self,
        *,
        country: str | int = 0,
        operator: str | None = None,
        service: str | None = None,
    ) -> list[ServiceCostItem]:
        """Get services with price and quantity for a country."""
        params: dict[str, Any] = {"country": country}
        if operator:
            params["operator"] = operator
        if service:
            params["service"] = service

        data = self.call("getServicesAndCost", params)
        return data if isinstance(data, list) else []
