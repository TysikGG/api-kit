"""VAK-SMS API client implementation."""

import time
from typing import Any

import httpx

from .errors import ERROR_DESCRIPTIONS, VakSmsError
from .types import CountNumber, CountryOperator, VakNumber

DEFAULT_SOFT_ID = ""
DEFAULT_BASE_URL = "https://vak-sms.com"


class VakSmsClient:
    """Client for the VAK-SMS temporary number and SMS OTP reception service.

    Args:
        api_key: VAK-SMS API key.
        base_url: Base URL of the API. Defaults to https://vak-sms.com.
        timeout: HTTP request timeout in seconds. Defaults to 30.0.
        soft_id: Optional software/partner identifier.

    Examples:
        >>> from vak_sms import VakSmsClient
        >>> client = VakSmsClient(api_key="your_api_key")
        >>> balance = client.get_balance()
        >>> print(balance)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        soft_id: str | None = None,
    ) -> None:
        if not api_key or not api_key.strip():
            raise VakSmsError("api_key is required to initialize VakSmsClient", "apiKeyNotFound")
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.soft_id = soft_id if soft_id is not None else DEFAULT_SOFT_ID
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout)

    def __enter__(self) -> "VakSmsClient":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def get_balance(self) -> float:
        """Retrieves the current account balance in RUB.

        Returns:
            The account balance as a float.

        Raises:
            VakSmsError: If the server returns an error or unexpected response.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> balance = client.get_balance()
            >>> print(f"Balance: {balance} RUB")
        """
        data = self._request("/api/getBalance/")
        if (
            isinstance(data, dict)
            and "balance" in data
            and isinstance(data["balance"], (int, float))
        ):
            return float(data["balance"])
        raise VakSmsError("Invalid getBalance response", "INVALID_RESPONSE", data)

    def get_number(
        self,
        service: str | list[str],
        country: str | None = None,
        operator: str | None = None,
        rent: bool = False,
        soft_id: str | None = None,
    ) -> VakNumber:
        """Orders a temporary virtual phone number.

        Args:
            service: Service code (e.g. 'tg', 'wa') or list of codes.
            country: 2-letter country code (e.g. 'ru', 'kz').
            operator: Optional network operator name (e.g. 'megafon').
            rent: Whether to lease number under extended rental.
            soft_id: Optional software/partner identifier.

        Returns:
            VakNumber containing phone number and idNum.

        Raises:
            VakSmsError: If the number cannot be ordered or stock is exhausted.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> number = client.get_number("tg", country="ru")
            >>> print(number.tel, number.id_num)
        """
        srv = ",".join(service) if isinstance(service, list) else service
        params: dict[str, Any] = {"service": srv}

        if country:
            params["country"] = country
        if operator:
            params["operator"] = operator
        if rent:
            params["rent"] = "true"

        effective_soft_id = soft_id if soft_id is not None else self.soft_id
        if effective_soft_id:
            params["softId"] = effective_soft_id

        data = self._request("/api/getNumber/", params)
        if isinstance(data, dict) and "idNum" in data and "tel" in data:
            return VakNumber(
                id_num=str(data["idNum"]),
                tel=str(data["tel"]),
                service=srv,
                rent=rent,
            )
        raise VakSmsError("Invalid getNumber response", "INVALID_RESPONSE", data)

    def prolong_number(
        self,
        service: str,
        tel: str | int,
        soft_id: str | None = None,
    ) -> VakNumber:
        """Extends rental duration for an existing phone number.

        Args:
            service: Service code.
            tel: Phone number without plus sign.
            soft_id: Optional software/partner identifier.

        Returns:
            VakNumber with extended order details.

        Raises:
            VakSmsError: If extension request fails.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> order = client.prolong_number("tg", "79991234567")
            >>> print(order.id_num)
        """
        params: dict[str, Any] = {"service": service, "tel": str(tel)}
        effective_soft_id = soft_id if soft_id is not None else self.soft_id
        if effective_soft_id:
            params["softId"] = effective_soft_id

        data = self._request("/api/prolongNumber/", params)
        if isinstance(data, dict) and "idNum" in data and "tel" in data:
            return VakNumber(
                id_num=str(data["idNum"]),
                tel=str(data["tel"]),
                service=service,
            )
        raise VakSmsError("Invalid prolongNumber response", "INVALID_RESPONSE", data)

    def get_sms_code(
        self,
        id_num: str,
        all_codes: bool = False,
    ) -> str | list[str] | None:
        """Retrieves incoming SMS code(s) for an active order.

        Args:
            id_num: Activation identifier.
            all_codes: Whether to return all received SMS codes.

        Returns:
            Single code string, list of strings, or None if code is not yet received.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> code = client.get_sms_code("abcd1234ef")
            >>> print("Received SMS code:", code)
        """
        params: dict[str, Any] = {"idNum": id_num}
        if all_codes:
            params["all"] = "true"

        data = self._request("/api/getSmsCode/", params)
        if isinstance(data, dict) and "smsCode" in data:
            return data["smsCode"]
        return None

    def wait_for_code(
        self,
        id_num: str,
        timeout: float = 120.0,
        interval: float = 3.0,
    ) -> str | None:
        """Polls until an SMS code arrives or timeout expires.

        Args:
            id_num: Activation identifier.
            timeout: Maximum seconds to wait. Defaults to 120.0.
            interval: Polling frequency in seconds. Defaults to 3.0.

        Returns:
            Received SMS code string or None if timed out.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> code = client.wait_for_code("abcd1234ef", timeout=60.0)
            >>> print("SMS code:", code)
        """
        start = time.time()
        while time.time() - start < timeout:
            code = self.get_sms_code(id_num)
            if code:
                if isinstance(code, list):
                    return code[-1] if code else None
                return str(code)
            time.sleep(interval)
        return None

    def set_status(self, id_num: str, status: str) -> str:
        """Updates the status of an ongoing number activation.

        Status options:
            - 'send': Wait for another SMS code
            - 'end': Successfully finish activation
            - 'bad': Report number as defective/cancel

        Args:
            id_num: Activation identifier.
            status: Status command ('send', 'end', 'bad').

        Returns:
            Status confirmation string.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> client.set_status("abcd1234ef", "end")
            'update'
        """
        data = self._request("/api/setStatus/", {"idNum": id_num, "status": status})
        if isinstance(data, dict) and "status" in data:
            return str(data["status"])
        return "ok"

    def get_count_number(
        self,
        service: str,
        country: str = "ru",
        operator: str | None = None,
    ) -> CountNumber:
        """Queries available number count and unit price for a service.

        Args:
            service: Service code.
            country: Country code (default 'ru').
            operator: Optional network operator name.

        Returns:
            CountNumber object with stock and price.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> count = client.get_count_number("tg", "ru")
            >>> print(count.count, count.price)
        """
        params: dict[str, Any] = {"service": service, "country": country, "price": 1}
        if operator:
            params["operator"] = operator

        data = self._request("/api/getCountNumber/", params)
        if isinstance(data, dict):
            cnt = data.get(service, 0)
            price = data.get("price")
            return CountNumber(
                service=service,
                count=int(cnt) if isinstance(cnt, (int, float)) else 0,
                price=float(price) if isinstance(price, (int, float)) else None,
            )
        raise VakSmsError("Invalid getCountNumber response", "INVALID_RESPONSE", data)

    def get_country_list(self) -> list[CountryOperator]:
        """Retrieves catalog of supported countries and available operators.

        Returns:
            List of CountryOperator objects.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> countries = client.get_country_list()
            >>> print(f"Supported countries: {len(countries)}")
        """
        data = self._request("/api/getCountryList/")
        if isinstance(data, list):
            res: list[CountryOperator] = []
            for item in data:
                if isinstance(item, dict):
                    res.append(
                        CountryOperator(
                            country_name=item.get("countryName", ""),
                            country_code=item.get("countryCode", ""),
                            operator_list=item.get("operatorList", []),
                        )
                    )
            return res
        raise VakSmsError("Invalid getCountryList response", "INVALID_RESPONSE", data)

    def get_count_numbers_list(
        self,
        country: str = "ru",
        operator: str | None = None,
        rent: bool = False,
    ) -> dict[str, Any]:
        """Retrieves full service inventory for a country.

        Args:
            country: Country code (default 'ru').
            operator: Optional network operator name.
            rent: Whether to query extended rental stock.

        Returns:
            Dictionary of services, quantities, and pricing.

        Examples:
            >>> client = VakSmsClient(api_key="key")
            >>> catalog = client.get_count_numbers_list("ru")
        """
        params: dict[str, Any] = {"country": country}
        if operator:
            params["operator"] = operator
        if rent:
            params["rent"] = "true"

        data = self._request("/api/getCountNumbersList/", params)
        return data if isinstance(data, dict) else {}

    def _request(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        query: dict[str, Any] = {"apiKey": self.api_key}
        if params:
            query.update(params)

        try:
            resp = self._client.get(endpoint, params=query)
            resp.raise_for_status()
            data = resp.json()

            if isinstance(data, dict):
                if "error" in data and data["error"]:
                    err_code = str(data["error"])
                    desc = ERROR_DESCRIPTIONS.get(err_code, f"VAK-SMS API error: {err_code}")
                    raise VakSmsError(desc, code=err_code, response_body=data)
                if "code" in data and data.get("code") and "message" in data:
                    raise VakSmsError(
                        str(data["message"]), code=str(data["code"]), response_body=data
                    )

            return data
        except httpx.HTTPError as exc:
            raise VakSmsError(f"HTTP request failed: {exc}", "NETWORK_ERROR") from exc
