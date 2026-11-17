"""Greedy SMS synchronous client implementation."""

from __future__ import annotations

import os
from typing import Any

import httpx

from .errors import AuthenticationError, create_greedy_sms_error
from .types import (
    ActivationStatusResponse,
    CancelMailOrderResponse,
    ContinuedRentNumber,
    GetCountriesResponse,
    GetHistoryResponse,
    GetMailOrdersResponse,
    GetNumbersStatusResponse,
    GetPricesResponse,
    GetRentListResponse,
    GetRentStatusResponse,
    GetServicesResponse,
    GetTopCountriesResponse,
    HealthResponse,
    MailDomainItem,
    MailPriceQuote,
    MailStatusResponse,
    OperatorCountryInfo,
    OrderedMailDomain,
    OrderedNumber,
    OrderedRentNumber,
    TopCountryPriceItem,
    UserInfo,
)

DEFAULT_BASE_URL = "https://api.greedy-sms.com"


class GreedySMS:
    """Synchronous client for the Greedy SMS activation, rental, and email API.

    Attributes:
        api_key: User API authentication token (x-api-key).
        base_url: Greedy SMS endpoint URL.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the GreedySMS client.

        Args:
            api_key: Greedy SMS API key. If not provided, reads from GREEDY_SMS_API_KEY.
            base_url: Custom API endpoint URL. Defaults to https://api.greedy-sms.com.
            timeout: Request timeout in seconds. Defaults to 30.0.
            user_agent: Optional custom User-Agent string.

        Raises:
            AuthenticationError: If no valid API key is found.

        Examples:
            >>> client = GreedySMS(api_key="your_api_key")
            >>> me = client.get_me()
        """
        resolved_key = (api_key or os.environ.get("GREEDY_SMS_API_KEY", "")).strip()
        if not resolved_key:
            raise AuthenticationError("API key is required")

        self.api_key = resolved_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")

        headers = {
            "x-api-key": self.api_key,
            "content-type": "application/json",
        }
        if user_agent:
            headers["User-Agent"] = user_agent

        self._client = httpx.Client(
            base_url=self.base_url,
            headers=headers,
            timeout=timeout,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> GreedySMS:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def _request(
        self,
        method: str,
        path: str,
        json: Any = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        """Internal helper for making JSON requests with structured error translation."""
        try:
            response = self._client.request(method, path, json=json, params=params)
            if response.is_error:
                try:
                    err_data = response.json()
                except Exception:
                    err_data = response.text
                raise create_greedy_sms_error(response.status_code, err_data)
            return response.json()
        except httpx.HTTPStatusError as err:
            try:
                body = err.response.json()
            except Exception:
                body = err.response.text
            raise create_greedy_sms_error(err.response.status_code, body) from err

    # ============================================================================
    # System & User
    # ============================================================================

    def check_health(self) -> HealthResponse:
        """Checks if the API process is running and accepting requests.

        Returns:
            Dictionary with health status (e.g. {'status': 'ok'}).

        Examples:
            >>> client.check_health()
            {'status': 'ok'}
        """
        resp = self._client.get("/health/live")
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    def get_me(self) -> UserInfo:
        """Retrieves user profile, balance, purchases, and discount tiers.

        Returns:
            Dictionary containing user profile information.

        Examples:
            >>> me = client.get_me()
            >>> print(f"Balance: {me['balance']} RUB")
        """
        return self._request("GET", "/users/getMe")  # type: ignore[no-any-return]

    def get_balance(self) -> float:
        """Convenience method returning current user balance in rubles.

        Returns:
            Balance as a float.

        Examples:
            >>> balance = client.get_balance()
            >>> print(f"Balance: {balance}")
        """
        user = self.get_me()
        return float(user["balance"])

    # ============================================================================
    # Activations: Catalog & Directories
    # ============================================================================

    def get_operators(self, country: int | None = None) -> list[OperatorCountryInfo]:
        """Lists mobile operators by country.

        Args:
            country: Optional country ID filter.

        Returns:
            List of country-operator records.

        Examples:
            >>> ops = client.get_operators(country=0)
        """
        body: dict[str, Any] = {}
        if country is not None:
            body["country"] = country
        return self._request("POST", "/activations/getOperators", json=body)  # type: ignore[no-any-return]

    def get_countries(
        self,
        page: int | None = None,
        page_size: int | None = None,
    ) -> GetCountriesResponse:
        """Lists available countries with localized titles and pagination.

        Args:
            page: Page number (1-based).
            page_size: Items per page.

        Returns:
            Paginated countries response.

        Examples:
            >>> countries = client.get_countries(page=1, page_size=20)
        """
        body: dict[str, Any] = {}
        if page is not None:
            body["page"] = page
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/activations/getCountries", json=body)  # type: ignore[no-any-return]

    def get_services(
        self,
        country: int | None = None,
        language: str | None = None,
        page: int | None = None,
        page_size: int | None = None,
    ) -> GetServicesResponse:
        """Lists available services with pagination.

        Args:
            country: Optional country ID.
            language: 'rus' or 'eng'.
            page: Page number.
            page_size: Items per page.

        Returns:
            Paginated services list.

        Examples:
            >>> services = client.get_services(country=0, language="eng")
        """
        body: dict[str, Any] = {}
        if country is not None:
            body["country"] = country
        if language is not None:
            body["language"] = language
        if page is not None:
            body["page"] = page
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/activations/getServices", json=body)  # type: ignore[no-any-return]

    def get_prices(
        self,
        country: int | None = None,
        service: str | None = None,
        page: int | None = None,
        page_size: int | None = None,
    ) -> GetPricesResponse:
        """Lists pricing and available numbers by country and service.

        Args:
            country: Optional country ID.
            service: Optional service code (e.g. 'tg').
            page: Page number.
            page_size: Items per page.

        Returns:
            Paginated prices response.

        Examples:
            >>> prices = client.get_prices(country=0, service="tg")
        """
        body: dict[str, Any] = {}
        if country is not None:
            body["country"] = country
        if service is not None:
            body["service"] = service
        if page is not None:
            body["page"] = page
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/activations/getPrices", json=body)  # type: ignore[no-any-return]

    def get_numbers_status(
        self,
        service: str,
        page: int = 1,
        page_size: int | None = None,
    ) -> GetNumbersStatusResponse:
        """Gets available number counts for a service.

        Args:
            service: Service code.
            page: Page number.
            page_size: Items per page.

        Returns:
            Paginated number availability response.

        Examples:
            >>> counts = client.get_numbers_status(service="tg", page=1)
        """
        body: dict[str, Any] = {"service": service, "page": page}
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/activations/getNumbersStatus", json=body)  # type: ignore[no-any-return]

    def get_list_of_top_countries_by_service(
        self,
        service: str,
    ) -> list[TopCountryPriceItem]:
        """Returns top 10 countries with pricing for a given service.

        Args:
            service: Service code.

        Returns:
            List of country-price pairs.

        Examples:
            >>> top10 = client.get_list_of_top_countries_by_service("tg")
        """
        return self._request(  # type: ignore[no-any-return]
            "POST",
            "/activations/getListOfTopCountriesByService",
            json={"service": service},
        )

    def get_top_countries_by_service(
        self,
        service: str,
        page: int = 1,
        page_size: int | None = None,
    ) -> GetTopCountriesResponse:
        """Returns top countries for a service with pagination.

        Args:
            service: Service code.
            page: Page number.
            page_size: Items per page.

        Returns:
            Paginated top countries response.

        Examples:
            >>> top = client.get_top_countries_by_service(service="tg", page=1)
        """
        body: dict[str, Any] = {"service": service, "page": page}
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/activations/getTopCountriesByService", json=body)  # type: ignore[no-any-return]

    # ============================================================================
    # Activations: Purchasing & Lifecycle
    # ============================================================================

    def get_number(
        self,
        service: str,
        country: int,
        verification_type: int | None = None,
        max: bool | None = None,
        max_price: float | str | None = None,
        provider_id: int | None = None,
    ) -> OrderedNumber:
        """Purchases a virtual phone number for activation.

        Args:
            service: Service short code (e.g. 'tg', 'wa').
            country: Country ID.
            verification_type: 1 for SMS, 2 for incoming call.
            max: Maximum price mode flag.
            max_price: Maximum allowed price in rubles.
            provider_id: Specific provider ID.

        Returns:
            Dictionary with activationId, phone, and price.

        Examples:
            >>> order = client.get_number(service="tg", country=2)
            >>> print(f"Phone: {order['phone']}, ID: {order['activationId']}")
        """
        body: dict[str, Any] = {
            "service": service,
            "country": country,
        }
        if verification_type is not None:
            body["verificationType"] = verification_type
        if max is not None:
            body["max"] = max
        if max_price is not None:
            body["maxPrice"] = max_price
        if provider_id is not None:
            body["providerId"] = provider_id

        return self._request("POST", "/activations/getNumber", json=body)  # type: ignore[no-any-return]

    def get_status(self, activation_id: int | str) -> ActivationStatusResponse:
        """Checks activation status and received code.

        Args:
            activation_id: Activation ID.

        Returns:
            Dictionary with status (e.g. 'STATUS_WAIT_CODE', 'STATUS_OK:<code>').

        Examples:
            >>> status = client.get_status(1001)
        """
        return self._request(  # type: ignore[no-any-return]
            "POST",
            "/activations/getStatus",
            json={"activationId": int(activation_id)},
        )

    def get_status_alternative(self, activation_id: int | str) -> ActivationStatusResponse:
        """Checks local activation status.

        Args:
            activation_id: Activation ID.

        Returns:
            Dictionary with status.

        Examples:
            >>> status = client.get_status_alternative(1001)
        """
        return self._request(  # type: ignore[no-any-return]
            "POST",
            "/activations/getStatusAlternative",
            json={"activationId": int(activation_id)},
        )

    def set_status(
        self,
        activation_id: int | str,
        status: str,
    ) -> ActivationStatusResponse:
        """Updates activation status ('Cancel', 'Finish', 'NewCode').

        Args:
            activation_id: Activation ID.
            status: Target action ('Cancel', 'Finish', 'NewCode').

        Returns:
            Updated status response.

        Examples:
            >>> client.set_status(1001, "Finish")
        """
        return self._request(  # type: ignore[no-any-return]
            "POST",
            "/activations/setStatus",
            json={"activationId": int(activation_id), "status": status},
        )

    def cancel_activation(self, activation_id: int | str) -> ActivationStatusResponse:
        """Cancels an activation order and refunds funds.

        Args:
            activation_id: Activation ID.

        Returns:
            Updated status response.

        Examples:
            >>> client.cancel_activation(1001)
        """
        return self.set_status(activation_id, "Cancel")

    def finish_activation(self, activation_id: int | str) -> ActivationStatusResponse:
        """Completes activation after successfully receiving SMS code.

        Args:
            activation_id: Activation ID.

        Returns:
            Updated status response.

        Examples:
            >>> client.finish_activation(1001)
        """
        return self.set_status(activation_id, "Finish")

    def request_new_code(self, activation_id: int | str) -> ActivationStatusResponse:
        """Requests another SMS code for the active number.

        Args:
            activation_id: Activation ID.

        Returns:
            Updated status response.

        Examples:
            >>> client.request_new_code(1001)
        """
        return self.set_status(activation_id, "NewCode")

    def get_history(
        self,
        active: bool | None = None,
        page: int | None = None,
        page_size: int | None = None,
    ) -> GetHistoryResponse:
        """Retrieves user's activation history.

        Args:
            active: If True, filters only currently active activations.
            page: Page number.
            page_size: Items per page.

        Returns:
            Paginated activations history.

        Examples:
            >>> history = client.get_history(active=True)
        """
        body: dict[str, Any] = {}
        if active is not None:
            body["active"] = active
        if page is not None:
            body["page"] = page
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/activations/getHistory", json=body)  # type: ignore[no-any-return]

    # ============================================================================
    # Rental (Long-Term Numbers)
    # ============================================================================

    def get_rent_prices(
        self,
        service: str,
        operator: str | None = None,
        country: int | None = None,
    ) -> dict[str, Any]:
        """Queries rental prices by service and country.

        Args:
            service: Service code.
            operator: Optional carrier name.
            country: Optional country ID.

        Returns:
            Rental prices dictionary.

        Examples:
            >>> prices = client.get_rent_prices(service="tg", country=0)
        """
        body: dict[str, Any] = {"service": service}
        if operator is not None:
            body["operator"] = operator
        if country is not None:
            body["country"] = country
        return self._request("POST", "/rent/getRentPrices", json=body)  # type: ignore[no-any-return]

    def get_rent_list(
        self,
        page: int | None = None,
        page_size: int | None = None,
    ) -> GetRentListResponse:
        """Lists active and historical rentals.

        Args:
            page: Page number.
            page_size: Items per page.

        Returns:
            Paginated rental orders list.

        Examples:
            >>> rentals = client.get_rent_list(page=1)
        """
        body: dict[str, Any] = {}
        if page is not None:
            body["page"] = page
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/rent/getRentList", json=body)  # type: ignore[no-any-return]

    def get_rent_status(
        self,
        rent_id: int | str,
        page: int = 1,
        page_size: int = 10,
    ) -> GetRentStatusResponse:
        """Gets rental status and received SMS messages.

        Args:
            rent_id: Rental order ID.
            page: Page number.
            page_size: Items per page.

        Returns:
            Rental status with messages list.

        Examples:
            >>> status = client.get_rent_status(rent_id=100)
        """
        body: dict[str, Any] = {
            "rentId": rent_id,
            "page": page,
            "pageSize": page_size,
        }
        return self._request("POST", "/rent/getRentStatus", json=body)  # type: ignore[no-any-return]

    def get_continue_rent_price_number(
        self,
        rent_id: int | str,
        time: int | None = None,
    ) -> dict[str, Any]:
        """Gets price quote for extending an active rental.

        Args:
            rent_id: Rental order ID.
            time: Duration in hours.

        Returns:
            Price quote dictionary {'price': ...}.

        Examples:
            >>> quote = client.get_continue_rent_price_number(rent_id=100, time=4)
        """
        body: dict[str, Any] = {"rentId": rent_id}
        if time is not None:
            body["time"] = time
        return self._request("POST", "/rent/getContinueRentPriceNumber", json=body)  # type: ignore[no-any-return]

    def get_rent_number(
        self,
        service: str,
        country: int,
        time: int,
        operator: str | None = None,
    ) -> OrderedRentNumber:
        """Rents a virtual number for a specified duration in hours.

        Args:
            service: Service code.
            country: Country ID.
            time: Duration in hours.
            operator: Optional carrier name.

        Returns:
            Rental order details.

        Examples:
            >>> rent = client.get_rent_number(service="tg", country=0, time=4)
            >>> print(f"Phone: {rent['phone']}, End: {rent['endDate']}")
        """
        body: dict[str, Any] = {
            "service": service,
            "country": country,
            "time": time,
        }
        if operator is not None:
            body["operator"] = operator
        return self._request("POST", "/rent/getRentNumber", json=body)  # type: ignore[no-any-return]

    def set_rent_status(
        self,
        rent_id: int | str,
        status: int | str,
    ) -> dict[str, Any]:
        """Updates rental order status.

        Args:
            rent_id: Rental order ID.
            status: Status code (e.g. 1=cancel, 2=finish).

        Returns:
            Status response dictionary.

        Examples:
            >>> client.set_rent_status(rent_id=100, status=2)
        """
        return self._request(  # type: ignore[no-any-return]
            "POST",
            "/rent/setRentStatus",
            json={"rentId": rent_id, "status": status},
        )

    def continue_rent_number(
        self,
        rent_id: int | str,
        time: int | None = None,
    ) -> ContinuedRentNumber:
        """Extends an active rental number.

        Args:
            rent_id: Rental order ID.
            time: Extension duration in hours.

        Returns:
            Updated rental record.

        Examples:
            >>> client.continue_rent_number(rent_id=100, time=4)
        """
        body: dict[str, Any] = {"rentId": rent_id}
        if time is not None:
            body["time"] = time
        return self._request("POST", "/rent/continueRentNumber", json=body)  # type: ignore[no-any-return]

    def continue_rent_number_v2(
        self,
        rent_id: int | str,
        time: int | None = None,
    ) -> ContinuedRentNumber:
        """Idempotently extends an active rental number (V2).

        Args:
            rent_id: Rental order ID.
            time: Extension duration in hours.

        Returns:
            Updated rental record.

        Examples:
            >>> client.continue_rent_number_v2(rent_id=100, time=4)
        """
        body: dict[str, Any] = {"rentId": rent_id}
        if time is not None:
            body["time"] = time
        return self._request("POST", "/v2/rent/continueRentNumber", json=body)  # type: ignore[no-any-return]

    # ============================================================================
    # Mail: Disposable Email Verification
    # ============================================================================

    def get_mail_domains(self, url: str) -> list[MailDomainItem]:
        """Lists available email domains for a target website.

        Args:
            url: Target website domain (e.g. 'discord.com').

        Returns:
            List of domain options with price and quantity.

        Examples:
            >>> domains = client.get_mail_domains("discord.com")
        """
        return self._request("POST", "/mail/getDomains", json={"url": url})  # type: ignore[no-any-return]

    def get_mail_price(self, url: str, domain: str) -> MailPriceQuote:
        """Gets price quote for purchasing email on domain for website.

        Args:
            url: Target website.
            domain: Mail domain.

        Returns:
            Price quote dictionary.

        Examples:
            >>> quote = client.get_mail_price("discord.com", "example.com")
        """
        return self._request(  # type: ignore[no-any-return]
            "POST",
            "/mail/getPrice",
            json={"url": url, "domain": domain},
        )

    def buy_mail_domain(self, url: str, domain: str) -> OrderedMailDomain:
        """Purchases a disposable email address for verification.

        Args:
            url: Target website.
            domain: Mail domain.

        Returns:
            Created email order details.

        Examples:
            >>> mail = client.buy_mail_domain("discord.com", "example.com")
            >>> print(f"Email: {mail['email']}, ID: {mail['id']}")
        """
        return self._request(  # type: ignore[no-any-return]
            "POST",
            "/mail/buyDomain",
            json={"url": url, "domain": domain},
        )

    def reorder_mail_domain(self, id: int | str) -> OrderedMailDomain:
        """Reorders / reactivates an existing email address.

        Args:
            id: Mail order ID.

        Returns:
            Reordered email details.

        Examples:
            >>> mail = client.reorder_mail_domain(123)
        """
        return self._request("POST", "/mail/reorderDomain", json={"id": id})  # type: ignore[no-any-return]

    def get_mail_status(self, id: int | str) -> MailStatusResponse:
        """Checks received message and verification code for an email order.

        Args:
            id: Mail order ID.

        Returns:
            Status dictionary containing received code and message.

        Examples:
            >>> status = client.get_mail_status(123)
            >>> print(f"Code: {status['value']}")
        """
        return self._request("POST", "/mail/getStatus", json={"id": id})  # type: ignore[no-any-return]

    def cancel_mail_order(self, id: int | str) -> CancelMailOrderResponse:
        """Cancels an email order and refunds balance.

        Args:
            id: Mail order ID.

        Returns:
            Cancellation result.

        Examples:
            >>> client.cancel_mail_order(123)
        """
        return self._request("POST", "/mail/cancelOrder", json={"id": id})  # type: ignore[no-any-return]

    def get_mail_orders(
        self,
        page: int | None = None,
        page_size: int | None = None,
    ) -> GetMailOrdersResponse:
        """Lists email orders with pagination.

        Args:
            page: Page number.
            page_size: Items per page.

        Returns:
            Paginated list of mail orders.

        Examples:
            >>> orders = client.get_mail_orders(page=1)
        """
        body: dict[str, Any] = {}
        if page is not None:
            body["page"] = page
        if page_size is not None:
            body["pageSize"] = page_size
        return self._request("POST", "/mail/getOrders", json=body)  # type: ignore[no-any-return]

    # ============================================================================
    # Legacy handler_api.php Compatibility
    # ============================================================================

    def handler_api(
        self,
        action: str,
        params: dict[str, Any] | None = None,
    ) -> str:
        """Direct call to the legacy SMS-Activate compatible handler_api.php endpoint.

        Args:
            action: Action name (e.g. 'getBalance', 'getNumber').
            params: Optional query parameters.

        Returns:
            Raw text response.

        Examples:
            >>> raw = client.handler_api("getBalance")
            >>> print(raw)
        """
        query: dict[str, Any] = {
            "api_key": self.api_key,
            "action": action,
        }
        if params:
            query.update(params)

        resp = self._client.get("/stubs/handler_api.php", params=query)
        resp.raise_for_status()
        return resp.text


# Alias for compatibility
GreedySMSClient = GreedySMS
