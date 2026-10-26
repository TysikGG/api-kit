from typing import Any

import httpx

from onlinesim.errors import OnlineSimError
from onlinesim.types import ActivationState, OrderResult

DEFAULT_DEV_ID = 9656076


class OnlineSim:
    """Client for the OnlineSIM virtual numbers and SMS verification API.

    Args:
        api_key: User API key for OnlineSIM.
        base_url: Base URL for OnlineSIM API. Defaults to "https://onlinesim.io/api".
        timeout: HTTP request timeout in seconds. Defaults to 30.0.

    Examples:
        >>> from onlinesim import OnlineSim
        >>> client = OnlineSim(api_key="your_api_key")
        >>> balance = client.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://onlinesim.io/api",
        timeout: float = 30.0,
    ) -> None:
        if not api_key:
            raise OnlineSimError("API key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "OnlineSim":
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
            100.50
        """
        data = self._request("/getBalance.php")
        bal = data.get("balance")
        if bal is None:
            raise OnlineSimError("Missing balance in API response", response_data=data)
        try:
            return float(bal)
        except (ValueError, TypeError) as exc:
            raise OnlineSimError(f"Invalid balance format: {bal}", response_data=data) from exc

    def get_tariffs(self, country: int | str | None = None) -> Any:
        """Retrieves price tariffs and available numbers catalog.

        Args:
            country: Optional country ID.

        Returns:
            Tariffs dictionary.

        Examples:
            >>> tariffs = client.get_tariffs(7)
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        return self._request("/getTariffs.php", params)

    def get_service_list(self, country: int | str | None = None) -> Any:
        """Retrieves service list and counts for a country.

        Args:
            country: Optional country code.

        Returns:
            Service list payload.

        Examples:
            >>> services = client.get_service_list(7)
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        return self._request("/getServiceList.php", params)

    def get_countries(self) -> Any:
        """Retrieves list of supported countries.

        Returns:
            Countries payload dictionary.

        Examples:
            >>> countries = client.get_countries()
        """
        return self._request("/getCountries.php")

    def get_num(
        self,
        service: str,
        country: int | str | None = None,
        reject: str | None = None,
        number: str | None = None,
        clean: bool = False,
    ) -> OrderResult:
        """Orders a disposable phone number for SMS activation.

        Args:
            service: Target service identifier (e.g. "telegram", "vk", "whatsapp").
            country: Country code.
            reject: Prefixes to reject.
            number: Specific desired number.
            clean: Whether to request clean session.

        Returns:
            OrderResult with assigned tzid.

        Examples:
            >>> order = client.get_num("telegram", country=7)
            >>> print(order.tzid)
        """
        params: dict[str, Any] = {
            "service": service,
            "dev_id": DEFAULT_DEV_ID,
        }
        if country is not None:
            params["country"] = country
        if reject is not None:
            params["reject"] = reject
        if number is not None:
            params["number"] = number
        if clean:
            params["clean"] = 1

        data = self._request("/getNum.php", params)
        tzid = data.get("tzid")
        if not tzid:
            raise OnlineSimError("No tzid returned by getNum", response_data=data)
        return OrderResult(tzid=int(tzid), response=data.get("response", "1"))

    def get_state(
        self,
        tzid: int | str | None = None,
        message_to_code: int | None = None,
        msg_list: int | None = None,
    ) -> list[ActivationState]:
        """Retrieves state and SMS content for activations.

        Args:
            tzid: Optional activation order ID.
            message_to_code: Optional flag to extract code from message.
            msg_list: Optional flag to return complete list of messages.

        Returns:
            List of ActivationState objects.

        Examples:
            >>> states = client.get_state(12345)
            >>> print(states[0].msg)
        """
        params: dict[str, Any] = {}
        if tzid is not None:
            params["tzid"] = tzid
        if message_to_code is not None:
            params["message_to_code"] = message_to_code
        if msg_list is not None:
            params["msg_list"] = msg_list

        data = self._request("/getState.php", params)
        if isinstance(data, list):
            return [self._parse_state(item) for item in data]
        if isinstance(data, dict):
            return [self._parse_state(data)]
        raise OnlineSimError(f"Unexpected getState format: {data}", response_data=data)

    def set_operation_ok(self, tzid: int | str) -> bool:
        """Confirms successful receipt and closes the order.

        Args:
            tzid: Activation order ID.

        Returns:
            True if operation was confirmed.

        Examples:
            >>> client.set_operation_ok(12345)
        """
        self._request("/setOperationOk.php", {"tzid": tzid})
        return True

    def set_operation_revise(self, tzid: int | str) -> bool:
        """Requests repeat SMS code for the active number.

        Args:
            tzid: Activation order ID.

        Returns:
            True if repeat code was requested.

        Examples:
            >>> client.set_operation_revise(12345)
        """
        self._request("/setOperationRevise.php", {"tzid": tzid})
        return True

    def get_rent_tariffs(self) -> Any:
        """Retrieves rental tariffs directory.

        Returns:
            Rent tariffs payload.

        Examples:
            >>> tariffs = client.get_rent_tariffs()
        """
        return self._request("/getRentTariffs.php")

    def get_rent_num(
        self,
        country: int | str,
        days: int,
        extension: bool = False,
    ) -> Any:
        """Orders a rental phone number.

        Args:
            country: Country code.
            days: Rental duration in days.
            extension: Whether to extend existing rent.

        Returns:
            Rent order result dictionary.

        Examples:
            >>> rent = client.get_rent_num(7, days=1)
        """
        params: dict[str, Any] = {
            "country": country,
            "days": days,
            "dev_id": DEFAULT_DEV_ID,
        }
        if extension:
            params["extension"] = 1
        return self._request("/getRentNum.php", params)

    def get_rent_state(self, tzid: int | str | None = None) -> Any:
        """Checks status of rental numbers.

        Args:
            tzid: Optional rental order ID.

        Returns:
            Rent state payload.

        Examples:
            >>> state = client.get_rent_state(12345)
        """
        params: dict[str, Any] = {}
        if tzid is not None:
            params["tzid"] = tzid
        return self._request("/getRentState.php", params)

    def close_rent_num(self, tzid: int | str) -> bool:
        """Releases and closes an active rental number.

        Args:
            tzid: Rental order ID.

        Returns:
            True if rental number was released.

        Examples:
            >>> client.close_rent_num(12345)
        """
        self._request("/closeRentNum.php", {"tzid": tzid})
        return True

    def _parse_state(self, item: dict[str, Any]) -> ActivationState:
        return ActivationState(
            tzid=int(item.get("tzid", 0)),
            response=str(item.get("response", "")),
            number=item.get("number"),
            msg=item.get("msg"),
            service=item.get("service"),
            time=item.get("time"),
            raw_data=item,
        )

    def _request(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        query: dict[str, Any] = {"apikey": self.api_key}
        if params:
            query.update(params)

        try:
            resp = self._client.get(endpoint, params=query)
        except httpx.RequestError as exc:
            raise OnlineSimError(f"HTTP request error: {exc}") from exc

        try:
            data = resp.json()
        except Exception as exc:
            raise OnlineSimError(f"Invalid JSON: {resp.text}") from exc

        if isinstance(data, dict):
            resp_code = data.get("response")
            if isinstance(resp_code, str):
                if (
                    resp_code.startswith("ERROR_")
                    or resp_code.startswith("WARNING_")
                    or resp_code == "NO_NUMBER"
                ):
                    raise OnlineSimError(
                        f"OnlineSIM error: {resp_code}",
                        code=resp_code,
                        response_data=data,
                    )
        return data
