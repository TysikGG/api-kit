from typing import Any

import httpx

from sms_man.errors import SmsManError
from sms_man.types import HandlerStatusResult, PhoneNumberOrder, SmsCodeResult

DEFAULT_REF = "s_iNhkmN48Jf"


class SmsMan:
    """Client for the SMS-MAN virtual number and SMS activation API.

    Args:
        token: User API token for SMS-MAN.
        base_url: Base URL for SMS-MAN API. Defaults to "https://api.sms-man.com".
        timeout: HTTP request timeout in seconds. Defaults to 30.0.

    Examples:
        >>> from sms_man import SmsMan
        >>> client = SmsMan(token="your_api_token")
        >>> balance = client.get_balance()
    """

    def __init__(
        self,
        token: str,
        base_url: str = "https://api.sms-man.com",
        timeout: float = 30.0,
    ) -> None:
        if not token:
            raise SmsManError("API token is required")
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "SmsMan":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def get_balance(self) -> float:
        """Retrieves user account balance.

        Returns:
            Current balance as a float.

        Examples:
            >>> balance = client.get_balance()
            >>> print(balance)
            120.0
        """
        data = self._call_control("get-balance")
        bal = data.get("balance")
        if bal is None:
            raise SmsManError("Missing balance in API response", response_data=data)
        try:
            return float(bal)
        except (ValueError, TypeError) as exc:
            raise SmsManError(f"Invalid balance format: {bal}", response_data=data) from exc

    def get_limits(
        self,
        country_id: int | None = None,
        application_id: int | None = None,
    ) -> Any:
        """Retrieves available number limits and counts.

        Args:
            country_id: Optional country identifier.
            application_id: Optional service identifier.

        Returns:
            Limits response dictionary.

        Examples:
            >>> limits = client.get_limits(country_id=1, application_id=1)
        """
        params: dict[str, Any] = {}
        if country_id is not None:
            params["country_id"] = country_id
        if application_id is not None:
            params["application_id"] = application_id
        return self._call_control("limits", params)

    def get_prices(self, country_id: int | None = None) -> Any:
        """Retrieves service pricing catalog.

        Args:
            country_id: Optional country identifier.

        Returns:
            Pricing dictionary.

        Examples:
            >>> prices = client.get_prices(country_id=1)
        """
        params: dict[str, Any] = {}
        if country_id is not None:
            params["country_id"] = country_id
        return self._call_control("get-prices", params)

    def get_countries(self) -> Any:
        """Retrieves list of supported countries.

        Returns:
            Countries dictionary.

        Examples:
            >>> countries = client.get_countries()
        """
        return self._call_control("countries")

    def get_applications(self) -> Any:
        """Retrieves list of supported applications and services.

        Returns:
            Applications dictionary.

        Examples:
            >>> apps = client.get_applications()
        """
        return self._call_control("applications")

    def get_number(self, country_id: int, application_id: int) -> PhoneNumberOrder:
        """Orders a disposable virtual phone number.

        Args:
            country_id: Country identifier (or 0 for random).
            application_id: Service identifier.

        Returns:
            PhoneNumberOrder with requestId and number string.

        Examples:
            >>> order = client.get_number(country_id=1, application_id=1)
            >>> print(order.number)
        """
        data = self._call_control(
            "get-number",
            {
                "country_id": country_id,
                "application_id": application_id,
                "ref": DEFAULT_REF,
            },
        )
        req_id = data.get("request_id")
        number = data.get("number_p") or data.get("number")
        if not req_id or not number:
            raise SmsManError("Incomplete number data returned by API", response_data=data)
        return PhoneNumberOrder(request_id=int(req_id), number=str(number))

    def get_sms(self, request_id: int) -> SmsCodeResult:
        """Retrieves the received SMS code for an active order.

        Args:
            request_id: Order request ID.

        Returns:
            SmsCodeResult object.

        Examples:
            >>> res = client.get_sms(12345)
            >>> print(res.sms_code)
        """
        data = self._call_control("get-sms", {"request_id": request_id})
        return SmsCodeResult(
            sms_code=data.get("sms_code"),
            error=data.get("error_msg"),
        )

    def set_status(self, request_id: int, status: str) -> bool:
        """Sets status of an active number order (e.g. 'ready', 'reject').

        Args:
            request_id: Order request ID.
            status: Target status string.

        Returns:
            True if status updated.

        Examples:
            >>> client.set_status(12345, "reject")
        """
        self._call_control("set-status", {"request_id": request_id, "status": status})
        return True

    def handler_get_balance(self) -> float:
        """Retrieves account balance via SMS-Activate compatible handler endpoint.

        Returns:
            Account balance.

        Examples:
            >>> balance = client.handler_get_balance()
        """
        text = self._call_handler("getBalance")
        if not text.startswith("ACCESS_BALANCE:"):
            raise SmsManError(f"Unexpected balance response: {text}", code=text)
        try:
            return float(text[len("ACCESS_BALANCE:") :])
        except ValueError as exc:
            raise SmsManError(f"Invalid balance format: {text}", code=text) from exc

    def handler_get_number(
        self,
        country: int | str,
        service: str,
    ) -> PhoneNumberOrder:
        """Orders a number via the handler endpoint.

        Args:
            country: Country identifier.
            service: Service code (e.g. 'tg', 'vk').

        Returns:
            PhoneNumberOrder with request ID and phone number.

        Examples:
            >>> order = client.handler_get_number(1, "tg")
        """
        text = self._call_handler(
            "getNumber",
            {
                "country": country,
                "service": service,
                "ref": DEFAULT_REF,
            },
        )
        if not text.startswith("ACCESS_NUMBER:"):
            raise SmsManError(f"Failed to order number: {text}", code=text)
        parts = text.split(":")
        if len(parts) < 3:
            raise SmsManError(f"Malformed ACCESS_NUMBER response: {text}", code=text)
        return PhoneNumberOrder(request_id=int(parts[1]), number=parts[2])

    def handler_get_status(self, order_id: int | str) -> HandlerStatusResult:
        """Checks status and verification code via the handler endpoint.

        Args:
            order_id: Order ID.

        Returns:
            HandlerStatusResult object.

        Examples:
            >>> status = client.handler_get_status(12345)
        """
        text = self._call_handler("getStatus", {"id": order_id})
        if text.startswith("STATUS_OK:"):
            return HandlerStatusResult(status="STATUS_OK", code=text[len("STATUS_OK:") :])
        return HandlerStatusResult(status=text)

    def handler_set_status(self, order_id: int | str, status: int) -> str:
        """Sets status via the handler endpoint.

        Args:
            order_id: Order ID.
            status: Status code.

        Returns:
            Status text.

        Examples:
            >>> client.handler_set_status(12345, 1)
        """
        return self._call_handler("setStatus", {"id": order_id, "status": status})

    def handler_get_prices(self, country: int | str | None = None) -> Any:
        """Retrieves price catalog via the handler endpoint.

        Args:
            country: Optional country ID.

        Returns:
            Prices dictionary or response text.

        Examples:
            >>> prices = client.handler_get_prices(1)
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        text = self._call_handler("getPrices", params)
        import json

        try:
            return json.loads(text)
        except Exception:
            return text

    def _call_control(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        query: dict[str, Any] = {"token": self.token}
        if params:
            query.update(params)

        try:
            resp = self._client.get(f"/control/{endpoint}", params=query)
        except httpx.RequestError as exc:
            raise SmsManError(f"HTTP request error: {exc}") from exc

        try:
            data = resp.json()
        except Exception as exc:
            raise SmsManError(f"Invalid JSON: {resp.text}") from exc

        if isinstance(data, dict) and data.get("success") is False:
            code = data.get("error_code")
            msg = data.get("error_msg") or f"SMS-MAN error: {code}"
            raise SmsManError(msg, code=code, response_data=data)
        return data

    def _call_handler(self, action: str, params: dict[str, Any] | None = None) -> str:
        query: dict[str, Any] = {
            "action": action,
            "api_key": self.token,
        }
        if params:
            query.update(params)

        try:
            resp = self._client.get("/stubs/handler_api.php", params=query)
        except httpx.RequestError as exc:
            raise SmsManError(f"HTTP request error: {exc}") from exc

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
        }
        for err in error_codes:
            if text == err or text.startswith(f"{err}:"):
                raise SmsManError(f"API error: {text}", code=text)

        return text
