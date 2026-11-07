import os
from typing import Any

import httpx

from .errors import NotLettersError, create_notletters_error
from .types import (
    ChangePasswordResult,
    EmailType,
    Letter,
    LetterFilters,
    Mail,
    UserData,
    parse_mail,
)

DEFAULT_BASE_URL = "https://api.notletters.com/v1"


class NotLetters:
    """Client for the NotLetters email receiving and mailbox API.

    Attributes:
        api_token: API authentication token.
        base_url: Base URL of the API.
    """

    def __init__(
        self,
        api_token: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the NotLetters client.

        Args:
            api_token: NotLetters API token. Defaults to NOTLETTERS_API_TOKEN
                environment variable.
            base_url: API base URL. Defaults to https://api.notletters.com/v1.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.

        Examples:
            >>> from notletters import NotLetters
            >>> client = NotLetters(api_token="your-token")
            >>> profile = client.get_me()
            >>> print(profile["username"], profile["balance"])
        """
        self.api_token = api_token or os.environ.get("NOTLETTERS_API_TOKEN")
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        ua = user_agent or "notletters-client/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "NotLetters":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def _request(
        self,
        method: str,
        path: str,
        json_data: dict[str, Any] | None = None,
    ) -> Any:
        try:
            response = self._client.request(
                method,
                path,
                json=json_data,
            )

            try:
                data = response.json()
            except Exception:
                data = response.text

            if response.status_code >= 400:
                raise create_notletters_error(
                    status_code=response.status_code,
                    data=data,
                    fallback_message=f"HTTP {response.status_code} error",
                )

            if isinstance(data, dict) and "code" in data:
                try:
                    code_num = int(data["code"])
                    if code_num >= 400:
                        raise create_notletters_error(
                            status_code=code_num,
                            data=data,
                        )
                except (ValueError, TypeError):
                    pass

            return data
        except httpx.HTTPStatusError as e:
            try:
                data = e.response.json()
            except Exception:
                data = e.response.text
            raise create_notletters_error(
                status_code=e.response.status_code,
                data=data,
                fallback_message=str(e),
            ) from e
        except httpx.RequestError as e:
            raise NotLettersError(f"HTTP request failed: {e}") from e

    def get_me(self) -> UserData:
        """Retrieves profile information and current balance for the authenticated user.

        Returns:
            Dictionary containing user ID, username, balance, and rate limit.

        Examples:
            >>> with NotLetters("your-token") as client:
            ...     profile = client.get_me()
            ...     print(f"User: {profile['username']}, Balance: {profile['balance']}")
        """
        res = self._request("GET", "/me")
        if not isinstance(res, dict) or "data" not in res:
            raise NotLettersError(
                "Invalid response format: missing data property",
                response_body=res,
            )
        return res["data"]

    def get_balance(self) -> float:
        """Convenience method to retrieve the current account balance.

        Returns:
            Current balance in rubles / account currency.

        Examples:
            >>> with NotLetters("your-token") as client:
            ...     balance = client.get_balance()
            ...     print(f"Balance: {balance}")
        """
        profile = self.get_me()
        return float(profile["balance"])

    def get_letters(
        self,
        email: str,
        password: str,
        *,
        search: str | None = None,
        star: bool | None = None,
        filters: LetterFilters | None = None,
    ) -> list[Letter]:
        """Retrieves email messages from a specific mailbox, with optional filters.

        Args:
            email: Mailbox email address.
            password: Mailbox password.
            search: Optional text query to search across message content, subject, and sender.
            star: Optional flag to filter by starred status.
            filters: Optional dictionary with 'search' and 'star' keys.

        Returns:
            List of retrieved email messages.

        Examples:
            >>> with NotLetters("your-token") as client:
            ...     letters = client.get_letters(
            ...         email="user@notletters.com",
            ...         password="secret-password",
            ...         search="Verification code",
            ...     )
            ...     for letter in letters:
            ...         print(letter["subject"], letter["letter"]["text"])
        """
        if not email:
            raise NotLettersError("email is required")
        if not password:
            raise NotLettersError("password is required")

        payload: dict[str, Any] = {
            "email": email,
            "password": password,
        }

        active_filters: dict[str, Any] = {}
        if filters:
            active_filters.update(filters)
        if search is not None:
            active_filters["search"] = search
        if star is not None:
            active_filters["star"] = star

        if active_filters:
            payload["filters"] = active_filters

        res = self._request("POST", "/letters", json_data=payload)
        if (
            not isinstance(res, dict)
            or "data" not in res
            or not isinstance(res["data"], dict)
            or "letters" not in res["data"]
            or not isinstance(res["data"]["letters"], list)
        ):
            raise NotLettersError(
                "Invalid response format: missing letters list",
                response_body=res,
            )

        return res["data"]["letters"]

    def change_password(
        self,
        email: str,
        new_password: str,
        old_password: str,
    ) -> ChangePasswordResult:
        """Changes the password of an existing mailbox.

        Args:
            email: Mailbox email address.
            new_password: New mailbox password.
            old_password: Current mailbox password.

        Returns:
            Dictionary with response code and confirmation message.

        Examples:
            >>> with NotLetters("your-token") as client:
            ...     res = client.change_password(
            ...         email="user@notletters.com",
            ...         old_password="old-password",
            ...         new_password="new-password",
            ...     )
            ...     print(res["data"])
        """
        if not email:
            raise NotLettersError("email is required")
        if not old_password:
            raise NotLettersError("old_password is required")
        if not new_password:
            raise NotLettersError("new_password is required")

        payload = {
            "email": email,
            "old_password": old_password,
            "new_password": new_password,
        }

        return self._request("POST", "/change-password", json_data=payload)

    def buy_emails(
        self,
        count: int,
        type_email: int | EmailType = EmailType.LIMIT,
    ) -> list[Mail]:
        """Purchases email mailboxes. Note: this method charges the account balance.

        Args:
            count: Number of emails to buy (minimum 1).
            type_email: Mailbox type code (LIMIT=0, UNLIMITED=1, RU_ZONE=2, PERSONAL=3).

        Returns:
            List of Mail objects containing email and password credentials.

        Examples:
            >>> from notletters import EmailType, NotLetters
            >>> with NotLetters("your-token") as client:
            ...     accounts = client.buy_emails(count=1, type_email=EmailType.LIMIT)
            ...     for acc in accounts:
            ...         print(f"Email: {acc.email}, Password: {acc.password}")
        """
        if not isinstance(count, int) or count < 1:
            raise NotLettersError("count must be an integer greater than or equal to 1")

        payload = {
            "count": count,
            "type_email": int(type_email),
        }

        res = self._request("POST", "/buy-emails", json_data=payload)
        if not isinstance(res, dict) or "data" not in res or not isinstance(res["data"], list):
            raise NotLettersError("Invalid response format: missing data array", response_body=res)

        return [parse_mail(item) for item in res["data"]]
