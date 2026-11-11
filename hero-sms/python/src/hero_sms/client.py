"""HeroSMS synchronous client implementation."""

from __future__ import annotations

import os
import re
from typing import Any

import httpx

from .errors import (
    HeroSMSError,
    check_for_errors,
    check_for_json_errors,
    is_json_error,
)
from .types import (
    ActivationHistoryItem,
    ActivationStatusCode,
    ActivationStatusV2,
    ActiveActivationsResponse,
    Country,
    GetAllSmsResponse,
    GetNumberV2Response,
    GetRentServicesAndCountriesResponse,
    OperatorsResponse,
    ParsedNumberResponse,
    ParsedStatusResponse,
    PriceInfo,
    ReactivationPriceResponse,
    RentPriceCount,
    ServicesListResponse,
    TopCountryInfo,
)

DEFAULT_BASE_URL = "https://hero-sms.com/stubs/handler_api.php"
DEFAULT_REF = "tysik"


class HeroSMS:
    """Synchronous client for the HeroSMS activation and rental API.

    Attributes:
        api_key: User API authentication token.
        base_url: HeroSMS endpoint URL.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the HeroSMS client.

        Args:
            api_key: HeroSMS API key. If not provided, reads from HERO_SMS_API_KEY.
            base_url: Custom API endpoint URL. Defaults to handler_api.php.
            timeout: Request timeout in seconds. Defaults to 30.0.
            user_agent: Optional custom User-Agent string.

        Raises:
            HeroSMSError: If no valid API key is found.

        Examples:
            >>> client = HeroSMS(api_key="your_key")
            >>> balance = client.get_balance()
        """
        resolved_key = (api_key or os.environ.get("HERO_SMS_API_KEY", "")).strip()
        if not resolved_key:
            raise HeroSMSError("NO_KEY", "API key is required")

        self.api_key = resolved_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")

        headers = {}
        if user_agent:
            headers["User-Agent"] = user_agent

        self._client = httpx.Client(
            headers=headers,
            timeout=timeout,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> HeroSMS:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def _request(self, action: str, params: dict[str, Any] | None = None) -> Any:
        """Internal helper to dispatch requests to handler_api.php."""
        query_params: dict[str, Any] = {
            "api_key": self.api_key,
            "action": action,
        }
        if params:
            for k, v in params.items():
                if v is not None:
                    query_params[k] = v

        response = self._client.get(self.base_url, params=query_params)
        response.raise_for_status()

        # Check content type or attempt json parsing if returned
        text = response.text.strip()

        # If it looks like JSON or content-type is json
        if (text.startswith("{") and text.endswith("}")) or (
            text.startswith("[") and text.endswith("]")
        ):
            try:
                data = response.json()
                if is_json_error(data):
                    check_for_json_errors(data)
                return data
            except Exception as ex:
                if isinstance(ex, HeroSMSError):
                    raise
                # Fall back to text inspection

        check_for_errors(text)
        return text

    # ============================================================================
    # Balance & Account
    # ============================================================================

    def get_balance(self) -> float:
        """Fetches the current account balance.

        Returns:
            Current balance as a float.

        Raises:
            HeroSMSError: If response cannot be parsed or server returned an error.

        Examples:
            >>> balance = client.get_balance()
            >>> print(f"Balance: {balance}")
        """
        resp = self._request("getBalance")
        match = re.search(r"ACCESS_BALANCE:(.+)", str(resp))
        if not match:
            raise HeroSMSError("PARSE_ERROR", f"Unexpected balance response: {resp}", str(resp))
        return float(match.group(1))

    # ============================================================================
    # Number Management
    # ============================================================================

    def get_number(
        self,
        service: str,
        country: int,
        max_price: float | None = None,
        fixed_price: str | None = None,
        phone_exception: str | None = None,
        operator: str | None = None,
    ) -> ParsedNumberResponse:
        """Requests a phone number for activation.

        Args:
            service: Service short code (e.g. 'tg', 'wa').
            country: Country numeric identifier.
            max_price: Optional maximum price willing to pay.
            fixed_price: Optional flag for purchasing strictly at specified max_price.
            phone_exception: Comma-separated list of prefix exceptions (max 20).
            operator: Specific mobile carrier / operator name.

        Returns:
            Dictionary with activation_id (int) and phone_number (str).

        Examples:
            >>> num = client.get_number(service="tg", country=2)
            >>> print(num["phone_number"], num["activation_id"])
        """
        params: dict[str, Any] = {
            "service": service,
            "country": country,
            "ref": DEFAULT_REF,
        }
        if max_price is not None:
            params["maxPrice"] = max_price
        if fixed_price is not None:
            params["fixedPrice"] = fixed_price
        if phone_exception is not None:
            params["phoneException"] = phone_exception
        if operator is not None:
            params["operator"] = operator

        resp = self._request("getNumber", params)
        match = re.search(r"ACCESS_NUMBER:(\d+):(.+)", str(resp))
        if not match:
            raise HeroSMSError("PARSE_ERROR", f"Unexpected number response: {resp}", str(resp))

        return {
            "activation_id": int(match.group(1)),
            "phone_number": match.group(2),
        }

    def get_number_v2(
        self,
        service: str,
        country: int,
        max_price: float | None = None,
        fixed_price: str | None = None,
        phone_exception: str | None = None,
        operator: str | None = None,
    ) -> GetNumberV2Response:
        """Requests a phone number returning detailed JSON metadata.

        Args:
            service: Service short code (e.g. 'tg', 'wa').
            country: Country numeric identifier.
            max_price: Optional maximum price willing to pay.
            fixed_price: Optional flag for purchasing strictly at specified max_price.
            phone_exception: Comma-separated list of prefix exceptions.
            operator: Specific mobile carrier / operator name.

        Returns:
            Full activation metadata dictionary.

        Examples:
            >>> details = client.get_number_v2(service="tg", country=2)
            >>> print(details["activationId"], details["activationCost"])
        """
        params: dict[str, Any] = {
            "service": service,
            "country": country,
            "ref": DEFAULT_REF,
        }
        if max_price is not None:
            params["maxPrice"] = max_price
        if fixed_price is not None:
            params["fixedPrice"] = fixed_price
        if phone_exception is not None:
            params["phoneException"] = phone_exception
        if operator is not None:
            params["operator"] = operator

        return self._request("getNumberV2", params)  # type: ignore[no-any-return]

    # ============================================================================
    # Activation Status Management
    # ============================================================================

    def set_status(self, id: int | str, status: ActivationStatusCode | int) -> str:
        """Updates activation status.

        Args:
            id: Activation ID.
            status: Status code (1=ready, 3=resend, 6=complete, 8=cancel).

        Returns:
            Server response code string.

        Examples:
            >>> client.set_status(12345, ActivationStatusCode.SMS_SENT)
        """
        status_val = status.value if isinstance(status, ActivationStatusCode) else status
        return str(self._request("setStatus", {"id": id, "status": status_val}))

    def mark_ready(self, id: int | str) -> str:
        """Informs server that client is ready to receive SMS (status 1).

        Args:
            id: Activation ID.

        Returns:
            Server response string (e.g. 'ACCESS_READY').

        Examples:
            >>> client.mark_ready(12345)
        """
        return self.set_status(id, ActivationStatusCode.SMS_SENT)

    def request_resend(self, id: int | str) -> str:
        """Requests another SMS code for the activation (status 3).

        Args:
            id: Activation ID.

        Returns:
            Server response string (e.g. 'ACCESS_RETRY_GET').

        Examples:
            >>> client.request_resend(12345)
        """
        return self.set_status(id, ActivationStatusCode.REQUEST_RESEND)

    def complete(self, id: int | str) -> str:
        """Confirms activation completion and receipt of code (status 6).

        Args:
            id: Activation ID.

        Returns:
            Server response string (e.g. 'ACCESS_ACTIVATION').

        Examples:
            >>> client.complete(12345)
        """
        return self.set_status(id, ActivationStatusCode.COMPLETE)

    def cancel(self, id: int | str) -> str:
        """Cancels activation and refunds funds (status 8).

        Args:
            id: Activation ID.

        Returns:
            Server response string (e.g. 'ACCESS_CANCEL').

        Examples:
            >>> client.cancel(12345)
        """
        return self.set_status(id, ActivationStatusCode.CANCEL)

    def get_status(self, id: int | str) -> ParsedStatusResponse:
        """Checks activation status and received SMS code.

        Args:
            id: Activation ID.

        Returns:
            Dictionary with status (e.g. 'STATUS_OK', 'STATUS_WAIT_CODE')
            and code if present.

        Examples:
            >>> res = client.get_status(12345)
            >>> if res["status"] == "STATUS_OK":
            ...     print(f"Code: {res['code']}")
        """
        resp = str(self._request("getStatus", {"id": id}))
        if resp.startswith("STATUS_OK:"):
            return {"status": "STATUS_OK", "code": resp.split(":", 1)[1]}
        if resp.startswith("STATUS_WAIT_RETRY:"):
            return {"status": "STATUS_WAIT_RETRY", "code": resp.split(":", 1)[1]}
        if resp in ("STATUS_WAIT_CODE", "STATUS_WAIT_RESEND", "STATUS_CANCEL"):
            return {"status": resp}
        return {"status": resp}

    def get_status_v2(self, id: int | str) -> ActivationStatusV2:
        """Retrieves detailed status metadata (V2) including call or SMS records.

        Args:
            id: Activation ID.

        Returns:
            Full verification status dictionary.

        Examples:
            >>> status = client.get_status_v2(12345)
            >>> print(status["sms"]["code"])
        """
        return self._request("getStatusV2", {"id": id})  # type: ignore[no-any-return]

    def get_active_activations(
        self,
        start: int | None = None,
        limit: int | None = None,
    ) -> ActiveActivationsResponse:
        """Lists active activation orders.

        Args:
            start: Pagination offset.
            limit: Maximum items to return.

        Returns:
            Active activations response dictionary.

        Examples:
            >>> orders = client.get_active_activations(limit=10)
        """
        params: dict[str, Any] = {}
        if start is not None:
            params["start"] = start
        if limit is not None:
            params["limit"] = limit
        return self._request("getActiveActivations", params)  # type: ignore[no-any-return]

    def get_history(
        self,
        start: int | None = None,
        end: int | None = None,
        offset: int | None = None,
        size: int | None = None,
    ) -> list[ActivationHistoryItem]:
        """Fetches activation history.

        Args:
            start: Start timestamp or offset.
            end: End timestamp.
            offset: Record offset.
            size: Number of items.

        Returns:
            List of activation history records.

        Examples:
            >>> history = client.get_history(size=20)
        """
        params: dict[str, Any] = {}
        if start is not None:
            params["start"] = start
        if end is not None:
            params["end"] = end
        if offset is not None:
            params["offset"] = offset
        if size is not None:
            params["size"] = size
        return self._request("getHistory", params)  # type: ignore[no-any-return]

    # ============================================================================
    # Reference Data & Catalogs
    # ============================================================================

    def get_countries(self) -> dict[str, Country]:
        """Lists available countries.

        Returns:
            Dictionary mapping country IDs to Country objects.

        Examples:
            >>> countries = client.get_countries()
            >>> print(countries["0"]["eng"])
        """
        return self._request("getCountries")  # type: ignore[no-any-return]

    def get_services_list(
        self,
        country: int | None = None,
        lang: str | None = None,
    ) -> ServicesListResponse:
        """Lists supported services.

        Args:
            country: Optional country ID filter.
            lang: Optional language code (e.g. 'en', 'ru').

        Returns:
            Services list dictionary.

        Examples:
            >>> services = client.get_services_list(country=0, lang="en")
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        if lang is not None:
            params["lang"] = lang
        return self._request("getServicesList", params)  # type: ignore[no-any-return]

    def get_operators(self, country: int | None = None) -> OperatorsResponse:
        """Lists mobile operators by country.

        Args:
            country: Optional country ID filter.

        Returns:
            Operators response dictionary.

        Examples:
            >>> ops = client.get_operators(country=0)
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        return self._request("getOperators", params)  # type: ignore[no-any-return]

    def get_prices(
        self,
        country: int | None = None,
        service: str | None = None,
    ) -> dict[str, dict[str, PriceInfo]]:
        """Queries current prices and number quantities.

        Args:
            country: Optional country ID filter.
            service: Optional service code filter.

        Returns:
            Nested mapping: country_id -> service_code -> PriceInfo.

        Examples:
            >>> prices = client.get_prices(country=0, service="tg")
        """
        params: dict[str, Any] = {}
        if country is not None:
            params["country"] = country
        if service is not None:
            params["service"] = service
        return self._request("getPrices", params)  # type: ignore[no-any-return]

    def get_top_countries_by_service(
        self,
        service: str | None = None,
        free_price: bool | None = None,
    ) -> list[TopCountryInfo]:
        """Returns top countries by popularity for a service.

        Args:
            service: Service short code.
            free_price: Optional free price filter flag.

        Returns:
            List of top country records.

        Examples:
            >>> top = client.get_top_countries_by_service(service="tg")
        """
        params: dict[str, Any] = {}
        if service is not None:
            params["service"] = service
        if free_price is not None:
            params["freePrice"] = free_price
        return self._request("getTopCountriesByService", params)  # type: ignore[no-any-return]

    def get_top_countries_by_service_rank(
        self,
        service: str | None = None,
        free_price: bool | None = None,
    ) -> list[TopCountryInfo]:
        """Returns top countries ranked for current user.

        Args:
            service: Service short code.
            free_price: Optional free price filter flag.

        Returns:
            List of top country records.

        Examples:
            >>> top = client.get_top_countries_by_service_rank(service="tg")
        """
        params: dict[str, Any] = {}
        if service is not None:
            params["service"] = service
        if free_price is not None:
            params["freePrice"] = free_price
        return self._request("getTopCountriesByServiceRank", params)  # type: ignore[no-any-return]

    # ============================================================================
    # Reactivation & Lifecycle
    # ============================================================================

    def reactivate(self, id: int | str) -> GetNumberV2Response:
        """Reactivates a previously ordered number.

        Args:
            id: Activation ID.

        Returns:
            Activation metadata dictionary.

        Examples:
            >>> reactivated = client.reactivate(12345)
        """
        return self._request("reactivate", {"id": id})  # type: ignore[no-any-return]

    def get_reactivation_price(self, id: int | str) -> ReactivationPriceResponse:
        """Queries the cost of reactivating a previous number.

        Args:
            id: Activation ID.

        Returns:
            Price quote dictionary.

        Examples:
            >>> quote = client.get_reactivation_price(12345)
        """
        return self._request("reactivationPrice", {"id": id})  # type: ignore[no-any-return]

    def get_all_sms(
        self,
        id: int | str,
        size: int | None = None,
        page: int | None = None,
    ) -> GetAllSmsResponse:
        """Fetches all SMS messages received for an activation.

        Args:
            id: Activation ID.
            size: Page size.
            page: Page number.

        Returns:
            Messages list and pagination metadata.

        Examples:
            >>> messages = client.get_all_sms(12345)
        """
        params: dict[str, Any] = {"id": id}
        if size is not None:
            params["size"] = size
        if page is not None:
            params["page"] = page
        return self._request("getAllSms", params)  # type: ignore[no-any-return]

    def finish_activation(self, id: int | str) -> None:
        """Marks activation as completely finished.

        Args:
            id: Activation ID.

        Examples:
            >>> client.finish_activation(12345)
        """
        self._request("finishActivation", {"id": id})

    def cancel_activation(self, id: int | str) -> None:
        """Cancels an activation order.

        Args:
            id: Activation ID.

        Examples:
            >>> client.cancel_activation(12345)
        """
        self._request("cancelActivation", {"id": id})

    # ============================================================================
    # Rental
    # ============================================================================

    def get_rent_prices(
        self,
        service: str,
        country: int | None = None,
        operator: str | None = None,
        currency: int | None = None,
    ) -> dict[str, dict[str, RentPriceCount]]:
        """Queries rental prices and inventory.

        Args:
            service: Service short code.
            country: Country ID.
            operator: Carrier name.
            currency: Currency code.

        Returns:
            Nested mapping: country_id -> duration_id -> RentPriceCount.

        Examples:
            >>> rent_prices = client.get_rent_prices(service="tg", country=0)
        """
        params: dict[str, Any] = {"service": service}
        if country is not None:
            params["country"] = country
        if operator is not None:
            params["operator"] = operator
        if currency is not None:
            params["currency"] = currency
        return self._request("serviceCountRent", params)  # type: ignore[no-any-return]

    def get_rent_services_and_countries(
        self,
        country: int,
        duration: int,
    ) -> GetRentServicesAndCountriesResponse:
        """Lists available rental services and mobile operators.

        Args:
            country: Country ID.
            duration: Rental duration in hours.

        Returns:
            Operators and services mapping with pricing.

        Examples:
            >>> rent_opts = client.get_rent_services_and_countries(country=0, duration=4)
        """
        return self._request(  # type: ignore[no-any-return]
            "getRentServicesAndCountries",
            {"country": country, "duration": duration},
        )

    def get_rent_number(
        self,
        service: str,
        country: int,
        duration: int,
        operator: str | None = None,
        currency: int | None = None,
    ) -> GetNumberV2Response:
        """Rents a phone number for a specified duration.

        Args:
            service: Service short code.
            country: Country ID.
            duration: Rental duration in hours.
            operator: Optional carrier name.
            currency: Optional currency code.

        Returns:
            Rental activation details.

        Examples:
            >>> rent = client.get_rent_number(service="tg", country=0, duration=4)
            >>> print(rent["phoneNumber"])
        """
        params: dict[str, Any] = {
            "service": service,
            "country": country,
            "duration": duration,
            "ref": DEFAULT_REF,
        }
        if operator is not None:
            params["operator"] = operator
        if currency is not None:
            params["currency"] = currency
        return self._request("getRentNumber", params)  # type: ignore[no-any-return]


# Alias for compatibility
HeroSMSClient = HeroSMS
