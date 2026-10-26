from typing import Any

import httpx

from give_sms.errors import GiveSmsError
from give_sms.types import ActivationNumber, CodeResult, HandlerStatusResult

# Internal constant for Give-SMS integration
PARTNER_KEY = "pk_39579ba6dfd61e59"


class GiveSms:
    """Client for the Give-SMS API.

    Supports both the native JSON API (/api/v1/) and the SMS-Activate compatible
    handler endpoint (/stubs/handler_api.php).

    Args:
        api_key: User API key for Give-SMS.
        base_url: Base URL for requests. Defaults to "https://give-sms.com".
        timeout: Request timeout in seconds. Defaults to 30.0.

    Examples:
        >>> from give_sms import GiveSms
        >>> client = GiveSms(api_key="your_api_key")
        >>> balance = client.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://give-sms.com",
        timeout: float = 30.0,
    ) -> None:
        if not api_key:
            raise GiveSmsError("API key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "GiveSms":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def get_balance(self) -> float:
        """Retrieves account balance via the native JSON API (/api/v1/).

        Returns:
            Current balance as a float.

        Examples:
            >>> balance = client.get_balance()
            >>> print(balance)
            150.0
        """
        data = self._call_api("getbalance")
        val = data.get("balance") or data.get("user_balance")
        if val is None:
            raise GiveSmsError("Missing balance in API response", response_data=data)
        try:
            return float(val)
        except (ValueError, TypeError) as exc:
            raise GiveSmsError(f"Invalid balance format: {val}", response_data=data) from exc

    def get_count(
        self,
        country: str | None = None,
        operator: str | None = None,
    ) -> dict[str, Any]:
        """Retrieves available number counts for services via /api/v1/.

        Args:
            country: Optional country identifier (e.g. "kazakhstan").
            operator: Optional telecom operator.

        Returns:
            Dictionary mapping service keys to available number counts.

        Examples:
            >>> counts = client.get_count(country="kazakhstan")
            >>> print(counts)
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        if operator is not None:
            params["operator"] = operator
        return self._call_api("getcount", params)

    def get_number(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> ActivationNumber:
        """Orders a phone number for the specified service via /api/v1/.

        Args:
            service: Target service identifier (e.g. "vk", "tg", "wa").
            country: Optional country name or ID.
            operator: Optional operator name.
            max_price: Optional maximum acceptable price.

        Returns:
            ActivationNumber with order ID and allocated phone number.

        Examples:
            >>> order = client.get_number(service="vk", country="kazakhstan")
            >>> print(order.id, order.number)
        """
        params: dict[str, Any] = {"service": service}
        if country is not None:
            params["country"] = country
        if operator is not None:
            params["operator"] = operator
        if max_price is not None:
            params["maxPrice"] = max_price

        data = self._call_api("getnumber", params)
        order_id = data.get("id")
        number = data.get("number") or data.get("phone")
        if not order_id or not number:
            raise GiveSmsError("Incomplete order data returned by API", response_data=data)
        return ActivationNumber(id=order_id, number=str(number))

    def get_code(self, order_id: str | int) -> CodeResult:
        """Retrieves received SMS code or order status via /api/v1/.

        Args:
            order_id: Activation order ID.

        Returns:
            CodeResult with verification code, status string, and extra data.

        Examples:
            >>> res = client.get_code(12345)
            >>> print(res.code, res.status)
        """
        data = self._call_api("getcode", {"id": order_id})
        code = data.get("code")
        status = str(data.get("status", "WAIT"))
        return CodeResult(status=status, code=code, extra=data)

    def repeat_code(self, order_id: str | int) -> bool:
        """Requests a repeat SMS code for an order via /api/v1/.

        Args:
            order_id: Activation order ID.

        Returns:
            True if repeat request was sent successfully.

        Examples:
            >>> client.repeat_code(12345)
            True
        """
        self._call_api("repeatcode", {"id": order_id})
        return True

    def cancel_number(self, order_id: str | int) -> bool:
        """Cancels an active phone number order via /api/v1/.

        Args:
            order_id: Activation order ID.

        Returns:
            True if cancelled successfully.

        Examples:
            >>> client.cancel_number(12345)
            True
        """
        self._call_api("cancelnumber", {"id": order_id})
        return True

    def ban_number(self, order_id: str | int) -> bool:
        """Marks a phone number as banned / blacklisted via /api/v1/.

        Args:
            order_id: Activation order ID.

        Returns:
            True if marked successfully.

        Examples:
            >>> client.ban_number(12345)
            True
        """
        self._call_api("bannumber", {"id": order_id})
        return True

    def get_reactivation_options(self, order_id: str | int) -> Any:
        """Retrieves reactivation options for an order via /api/v1/.

        Args:
            order_id: Activation order ID.

        Returns:
            Reactivation options payload.

        Examples:
            >>> options = client.get_reactivation_options(12345)
        """
        return self._call_api("getreactivationoptions", {"id": order_id})

    def reactivate(self, order_id: str | int) -> Any:
        """Reactivates a previously ordered number via /api/v1/.

        Args:
            order_id: Activation order ID.

        Returns:
            Reactivation result payload.

        Examples:
            >>> res = client.reactivate(12345)
        """
        return self._call_api("reactivation", {"id": order_id})

    def get_all(self) -> Any:
        """Retrieves all active orders for the account via /api/v1/.

        Returns:
            Active orders response.

        Examples:
            >>> orders = client.get_all()
        """
        return self._call_api("getall")

    def handler_get_balance(self) -> float:
        """Retrieves account balance via SMS-Activate compatible handler endpoint.

        Returns:
            Account balance.

        Examples:
            >>> balance = client.handler_get_balance()
        """
        text = self._call_handler("getBalance")
        if not text.startswith("ACCESS_BALANCE:"):
            raise GiveSmsError(f"Unexpected balance response: {text}", code=text)
        try:
            return float(text[len("ACCESS_BALANCE:") :])
        except ValueError as exc:
            raise GiveSmsError(f"Invalid balance format: {text}", code=text) from exc

    def handler_get_numbers_status(
        self,
        country: str | int | None = None,
        operator: str | None = None,
    ) -> dict[str, Any]:
        """Retrieves available number counts via the handler endpoint.

        Args:
            country: Optional country ID.
            operator: Optional operator name.

        Returns:
            Service count mapping dictionary.

        Examples:
            >>> counts = client.handler_get_numbers_status()
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        if operator is not None:
            params["operator"] = operator
        text = self._call_handler("getNumbersStatus", params)
        import json

        try:
            return json.loads(text)
        except Exception as exc:
            raise GiveSmsError(f"Invalid JSON from handler: {text}", code=text) from exc

    def handler_get_number(
        self,
        service: str,
        country: str | int | None = None,
        operator: str | None = None,
        max_price: float | int | None = None,
    ) -> ActivationNumber:
        """Orders a number via the handler endpoint.

        Args:
            service: Target service code (e.g. "vk").
            country: Optional country ID.
            operator: Optional operator name.
            max_price: Optional maximum price.

        Returns:
            ActivationNumber with order ID and phone number.

        Examples:
            >>> num = client.handler_get_number(service="vk", country=2)
        """
        params: dict[str, Any] = {"service": service}
        if country is not None:
            params["country"] = country
        if operator is not None:
            params["operator"] = operator
        if max_price is not None:
            params["maxPrice"] = max_price

        text = self._call_handler("getNumber", params)
        if not text.startswith("ACCESS_NUMBER:"):
            raise GiveSmsError(f"Failed to order number: {text}", code=text)
        parts = text.split(":")
        if len(parts) < 3:
            raise GiveSmsError(f"Malformed ACCESS_NUMBER response: {text}", code=text)
        return ActivationNumber(id=parts[1], number=parts[2])

    def handler_set_status(self, order_id: str | int, status: int) -> str:
        """Sets order status via the handler endpoint.

        Args:
            order_id: Activation order ID.
            status: Status code (1 = ready, 3 = retry, 6 = finish, 8 = cancel).

        Returns:
            Status text response.

        Examples:
            >>> client.handler_set_status(12345, 1)
            'ACCESS_READY'
        """
        return self._call_handler("setStatus", {"id": order_id, "status": status})

    def handler_get_status(self, order_id: str | int) -> HandlerStatusResult:
        """Retrieves order status and SMS code via the handler endpoint.

        Args:
            order_id: Activation order ID.

        Returns:
            HandlerStatusResult with status and code.

        Examples:
            >>> status = client.handler_get_status(12345)
            >>> print(status.status, status.code)
        """
        text = self._call_handler("getStatus", {"id": order_id})
        if text.startswith("STATUS_OK:"):
            return HandlerStatusResult(status="STATUS_OK", code=text[len("STATUS_OK:") :])
        if text.startswith("STATUS_WAIT_RETRY:"):
            return HandlerStatusResult(
                status="STATUS_WAIT_RETRY",
                code=text[len("STATUS_WAIT_RETRY:") :],
            )
        return HandlerStatusResult(status=text)

    def handler_get_prices(
        self,
        country: str | int | None = None,
        service: str | None = None,
        tiers: int | None = None,
    ) -> Any:
        """Retrieves price catalog via handler endpoint.

        Args:
            country: Optional country ID.
            service: Optional service name.
            tiers: Optional tiers flag (1 for detailed tiers).

        Returns:
            Price catalog response dictionary.

        Examples:
            >>> prices = client.handler_get_prices(country=2)
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        if service is not None:
            params["service"] = service
        if tiers is not None:
            params["tiers"] = tiers

        text = self._call_handler("getPrices", params)
        import json

        try:
            return json.loads(text)
        except Exception as exc:
            raise GiveSmsError(f"Invalid JSON from handler: {text}", code=text) from exc

    def _call_api(self, method: str, extra_params: dict[str, Any] | None = None) -> Any:
        params: dict[str, Any] = {
            "method": method,
            "userkey": self.api_key,
            "partner_key": PARTNER_KEY,
        }
        if extra_params:
            params.update(extra_params)

        try:
            resp = self._client.get("/api/v1/", params=params)
        except httpx.RequestError as exc:
            raise GiveSmsError(f"HTTP request error: {exc}") from exc

        try:
            body = resp.json()
        except Exception as exc:
            msg = f"Invalid JSON response: {resp.text}"
            raise GiveSmsError(msg, code=resp.status_code) from exc

        if isinstance(body, dict) and "status" in body:
            status = body.get("status")
            if status != 200 and status != 1:
                data = body.get("data")
                msg = (
                    data.get("msg")
                    if isinstance(data, dict)
                    else (body.get("msg") or f"API error status {status}")
                )
                raise GiveSmsError(msg, code=status, response_data=body)
            return body.get("data")
        return body

    def _call_handler(self, action: str, extra_params: dict[str, Any] | None = None) -> str:
        params: dict[str, Any] = {
            "action": action,
            "api_key": self.api_key,
            "partner_key": PARTNER_KEY,
        }
        if extra_params:
            params.update(extra_params)

        try:
            resp = self._client.get("/stubs/handler_api.php", params=params)
        except httpx.RequestError as exc:
            raise GiveSmsError(f"HTTP request error: {exc}") from exc

        text = resp.text.strip()
        error_codes = {
            "BAD_KEY",
            "NO_KEY",
            "ERROR_SQL",
            "BAD_ACTION",
            "BAD_SERVICE",
            "NO_ACTIVATION",
            "BAD_STATUS",
            "NO_BALANCE",
            "NO_NUMBERS",
            "WRONG_SERVICE",
            "BAD_COUNTRY",
            "YOU_TEMPORARY_BANNED",
        }
        for err_code in error_codes:
            if text == err_code or text.startswith(f"{err_code}:"):
                raise GiveSmsError(f"API error: {text}", code=text)

        return text
