import os
from typing import Any

import httpx

from .errors import SMSBulkError
from .types import (
    Activation,
    ActivationListResponse,
    BalanceResponse,
    CountriesResponse,
    EmailActivation,
    EmailActivationListResponse,
    EmailDomainItem,
    ServiceCatalogItem,
    ServiceCountriesResponse,
    ServicesResponse,
    TransactionListResponse,
)

REF_ID = "3XTTWRX9"


class SMSBulk:
    """Client for the SMSBulk virtual number and email verification API.

    Attributes:
        api_key: SMSBulk API key.
        base_url: Base URL of the API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the SMSBulk client.

        Args:
            api_key: SMSBulk API key. Defaults to SMSBULK_API_KEY environment variable.
            base_url: Base URL for the SMSBulk API. Defaults to https://smsbulk.net/api.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.

        Examples:
            >>> from smsbulk import SMSBulk
            >>> client = SMSBulk(api_key="your-api-key")
            >>> balance = client.get_balance()
            >>> print(balance["balance"])
        """
        self.api_key = api_key or os.environ.get("SMSBULK_API_KEY")
        self.base_url = (base_url or "https://smsbulk.net/api").rstrip("/")
        ua = user_agent or "smsbulk-client/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "SMSBulk":
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
            response = self._client.request(
                method,
                path,
                params=params,
                json=json_data,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            try:
                data = e.response.json()
            except Exception:
                data = None

            msg = "SMSBulk API error"
            code = None
            if isinstance(data, dict):
                msg = data.get("message") or data.get("error") or msg
                code = data.get("error")

            raise SMSBulkError(
                message=str(msg),
                status_code=status_code,
                code=str(code) if code else None,
                response_body=data,
            ) from e
        except httpx.RequestError as e:
            raise SMSBulkError(f"HTTP request failed: {e}") from e

    def get_balance(self) -> BalanceResponse:
        """Retrieves the current wallet balance.

        Returns:
            Dictionary containing balance and currency.

        Examples:
            >>> balance = client.get_balance()
            >>> print(f"{balance['balance']} {balance['currency']}")
        """
        return self._request("GET", "/v1/wallet/balance")

    def get_transactions(
        self,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> TransactionListResponse:
        """Lists wallet transactions.

        Args:
            limit: Maximum items to return.
            cursor: Cursor for next page pagination.

        Returns:
            Dictionary containing data list and nextCursor.

        Examples:
            >>> txs = client.get_transactions(limit=10)
            >>> print(len(txs["data"]))
        """
        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if cursor is not None:
            params["cursor"] = cursor
        return self._request("GET", "/v1/wallet/transactions", params=params)

    def get_services(self) -> ServicesResponse:
        """Lists all supported services in the catalog.

        Returns:
            Dictionary containing service items and total count.

        Examples:
            >>> services = client.get_services()
            >>> print(f"Total services: {services['count']}")
        """
        return self._request("GET", "/v1/services")

    def get_service(self, slug: str) -> ServiceCatalogItem:
        """Gets detailed catalog information for a single service.

        Args:
            slug: Service slug (e.g. 'whatsapp').

        Returns:
            Service details dictionary.

        Examples:
            >>> s = client.get_service("whatsapp")
            >>> print(s["name"])
        """
        return self._request("GET", f"/v1/services/{slug}")

    def get_countries(self) -> CountriesResponse:
        """Lists all supported countries.

        Returns:
            Dictionary containing country items and total count.

        Examples:
            >>> countries = client.get_countries()
            >>> print(f"Total countries: {countries['count']}")
        """
        return self._request("GET", "/v1/countries")

    def get_service_countries(self, slug: str) -> ServiceCountriesResponse:
        """Lists in-stock countries and prices for a service.

        Args:
            slug: Service slug (e.g. 'whatsapp').

        Returns:
            Dictionary with service details and list of available countries.

        Examples:
            >>> info = client.get_service_countries("whatsapp")
            >>> print(len(info["countries"]))
        """
        return self._request("GET", f"/v1/services/{slug}/countries")

    def create_activation(
        self,
        service_code: str,
        country_iso: str,
        operator: str | None = None,
        max_price: str | None = None,
    ) -> Activation:
        """Reserves a virtual phone number for SMS verification.

        Args:
            service_code: Service identifier code (e.g. 'wa', 'tg').
            country_iso: ISO 3166-1 alpha-2 country code (e.g. 'US', 'TR').
            operator: Optional carrier filter.
            max_price: Optional maximum acceptable price.

        Returns:
            Activation details including reserved phone number.

        Examples:
            >>> act = client.create_activation(service_code="wa", country_iso="US")
            >>> print(act["phoneNumber"])
        """
        payload: dict[str, Any] = {
            "serviceCode": service_code,
            "countryIso": country_iso,
            "ref_id": REF_ID,
        }
        if operator is not None:
            payload["operator"] = operator
        if max_price is not None:
            payload["maxPrice"] = max_price

        return self._request("POST", "/v1/activations", json_data=payload)

    def get_activations(
        self,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> ActivationListResponse:
        """Lists user activations.

        Args:
            limit: Maximum items to return.
            cursor: Cursor for pagination.

        Returns:
            List of activations and nextCursor.

        Examples:
            >>> acts = client.get_activations(limit=5)
            >>> print(len(acts["data"]))
        """
        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if cursor is not None:
            params["cursor"] = cursor
        return self._request("GET", "/v1/activations", params=params)

    def get_activation(self, activation_id: str) -> Activation:
        """Retrieves details and SMS code for an activation.

        Args:
            activation_id: Activation ID.

        Returns:
            Activation details dictionary.

        Examples:
            >>> act = client.get_activation("act_123")
            >>> print(act["status"])
        """
        return self._request("GET", f"/v1/activations/{activation_id}")

    def cancel_activation(self, activation_id: str) -> Activation:
        """Cancels an activation and refunds the balance.

        Args:
            activation_id: Activation ID to cancel.

        Returns:
            Updated activation details.

        Examples:
            >>> act = client.cancel_activation("act_123")
            >>> print(act["status"])
        """
        return self._request("DELETE", f"/v1/activations/{activation_id}")

    def complete_activation(self, activation_id: str) -> Activation:
        """Marks an activation as finished.

        Args:
            activation_id: Activation ID to complete.

        Returns:
            Updated activation details.

        Examples:
            >>> act = client.complete_activation("act_123")
            >>> print(act["status"])
        """
        return self._request("POST", f"/v1/activations/{activation_id}/complete")

    def resend_activation(self, activation_id: str) -> Activation:
        """Requests an additional SMS verification code.

        Args:
            activation_id: Activation ID.

        Returns:
            Updated activation details.

        Examples:
            >>> act = client.resend_activation("act_123")
            >>> print(act["status"])
        """
        return self._request("POST", f"/v1/activations/{activation_id}/request-resend")

    def get_email_domains(self, site: str) -> list[EmailDomainItem]:
        """Lists available email domains and pricing for a site.

        Args:
            site: Target website (e.g. 'telegram.com').

        Returns:
            List of email domains with pricing and count.

        Examples:
            >>> domains = client.get_email_domains("telegram.com")
            >>> print([d["name"] for d in domains])
        """
        return self._request(
            "GET",
            "/v1/email-activations/domains",
            params={"site": site},
        )

    def create_email_activation(
        self,
        site: str,
        domain: str,
    ) -> EmailActivation:
        """Purchases a disposable email address for verification.

        Args:
            site: Target website (e.g. 'telegram.com').
            domain: Domain name (e.g. 'gmx.com').

        Returns:
            Email activation details including emailAddress.

        Examples:
            >>> act = client.create_email_activation(site="telegram.com", domain="gmx.com")
            >>> print(act["emailAddress"])
        """
        return self._request(
            "POST",
            "/v1/email-activations",
            json_data={"site": site, "domain": domain},
        )

    def get_email_activations(
        self,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> EmailActivationListResponse:
        """Lists email activations.

        Args:
            limit: Maximum items to return.
            cursor: Cursor for pagination.

        Returns:
            List of email activations and nextCursor.

        Examples:
            >>> acts = client.get_email_activations(limit=5)
            >>> print(len(acts["data"]))
        """
        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if cursor is not None:
            params["cursor"] = cursor
        return self._request("GET", "/v1/email-activations", params=params)

    def get_email_activation(self, activation_id: str) -> EmailActivation:
        """Retrieves details and OTP for an email activation.

        Args:
            activation_id: Email activation ID.

        Returns:
            Email activation details dictionary.

        Examples:
            >>> act = client.get_email_activation("em_123")
            >>> print(act["otpValue"])
        """
        return self._request("GET", f"/v1/email-activations/{activation_id}")

    def cancel_email_activation(self, activation_id: str) -> EmailActivation:
        """Cancels an email activation.

        Args:
            activation_id: Email activation ID to cancel.

        Returns:
            Updated email activation details.

        Examples:
            >>> act = client.cancel_email_activation("em_123")
            >>> print(act["status"])
        """
        return self._request("DELETE", f"/v1/email-activations/{activation_id}")

    def reorder_email_activation(self, activation_id: str) -> EmailActivation:
        """Reopens an email address for further verification messages.

        Args:
            activation_id: Email activation ID to reopen.

        Returns:
            Updated email activation details.

        Examples:
            >>> act = client.reorder_email_activation("em_123")
            >>> print(act["status"])
        """
        return self._request("POST", f"/v1/email-activations/{activation_id}/reorder")
