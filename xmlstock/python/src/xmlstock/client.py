import re
from typing import Any

import httpx

from xmlstock.errors import XmlStockError
from xmlstock.types import BalanceInfo

DEFAULT_SOFT_ID = "7ee4fabf80ee75b2c5bfa100f8fe169f"


class XmlStockClient:
    """Client for the XMLStock search engine API (Yandex XML, Google XML, and Wordstat).

    Args:
        user: XMLStock User ID from dashboard.
        api_key: XMLStock API key from dashboard.
        base_url: Base URL for XMLStock API. Defaults to "https://xmlstock.com".
        timeout: HTTP request timeout in seconds. Defaults to 30.0.

    Examples:
        >>> from xmlstock import XmlStockClient
        >>> client = XmlStockClient(user="12345", api_key="your_api_key")
        >>> balance = client.get_balance()
    """

    def __init__(
        self,
        user: str | int,
        api_key: str,
        base_url: str = "https://xmlstock.com",
        timeout: float = 30.0,
    ) -> None:
        if not user:
            raise XmlStockError("User ID is required", code="MISSING_USER")
        if not api_key:
            raise XmlStockError("API key is required", code="MISSING_API_KEY")

        self.user = str(user)
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "XmlStockClient":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def get_balance(self) -> BalanceInfo:
        """Retrieves the current account balance, limits, and tariff details.

        This is a free service call that does not consume search limits.

        Returns:
            Dictionary containing balance and account details.

        Raises:
            XmlStockError: If the API returns an error or network request fails.

        Examples:
            >>> client = XmlStockClient(user="12345", api_key="key")
            >>> info = client.get_balance()
            >>> print(info.get("balance"))
        """
        params: dict[str, Any] = {
            "do": "balance",
            "user": self.user,
            "key": self.api_key,
            "soft_id": DEFAULT_SOFT_ID,
        }

        try:
            response = self._client.get("/api/", params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as err:
            raise XmlStockError(
                f"HTTP {err.response.status_code}: {err.response.text}",
                status=err.response.status_code,
                response_data=err.response.text,
            ) from err
        except httpx.RequestError as err:
            raise XmlStockError(f"Request failed: {err}") from err

        text = response.text.strip()
        if text.startswith("ERROR_"):
            raise XmlStockError(
                f"XMLStock balance error: {text}",
                code=text,
                status=response.status_code,
                response_data=text,
            )

        try:
            data = response.json()
            if isinstance(data, dict):
                err_text = data.get("error") or data.get("Error")
                if err_text:
                    raise XmlStockError(
                        f"XMLStock balance error: {err_text}",
                        code="API_ERROR",
                        status=response.status_code,
                        response_data=data,
                    )
                return data
            return {"raw": data}
        except (ValueError, KeyError) as err:
            if isinstance(err, XmlStockError):
                raise
            return {"raw": text}

    def search_yandex(
        self,
        query: str,
        lr: int | None = None,
        groupby: int | None = None,
        page: int | None = None,
        domain: str | None = None,
        filter: str | None = None,
        device: str | None = None,
        sortby: str | None = None,
        maxpassages: int | None = None,
        **kwargs: Any,
    ) -> str:
        """Performs an automated search query via Yandex XML Proxy.

        Args:
            query: The search query string.
            lr: Optional region ID (e.g. 213 for Moscow, 225 for Russia).
            groupby: Number of results per page (multiples of 10, up to 100).
            page: Page number starting from 0.
            domain: Search domain zone (e.g. 'ru', 'com', 'by', 'kz').
            filter: Safe search filter ('none', 'moderate', 'strict').
            device: Layout device type ('desktop', 'mobile').
            sortby: Sort order ('rlv' for relevance, 'tm' for date).
            maxpassages: Number of snippet passages per document (1-5).
            **kwargs: Extra custom parameters.

        Returns:
            Raw XML string response from Yandex XML.

        Raises:
            XmlStockError: If query is empty, or API returns an error XML.

        Examples:
            >>> client = XmlStockClient(user="12345", api_key="key")
            >>> xml = client.search_yandex("buy laptop", lr=213, groupby=10)
        """
        return self._execute_search(
            "/yandex/xml/",
            query=query,
            lr=lr,
            groupby=groupby,
            page=page,
            domain=domain,
            filter=filter,
            device=device,
            sortby=sortby,
            maxpassages=maxpassages,
            **kwargs,
        )

    def search_yandex_live(
        self,
        query: str,
        lr: int | None = None,
        groupby: int | None = None,
        page: int | None = None,
        domain: str | None = None,
        filter: str | None = None,
        device: str | None = None,
        sortby: str | None = None,
        maxpassages: int | None = None,
        **kwargs: Any,
    ) -> str:
        """Performs a real-time live search query via Yandex Live XML.

        Args:
            query: The search query string.
            lr: Optional region ID.
            groupby: Results count per page.
            page: Page number starting from 0.
            domain: Search domain.
            filter: Safe search level.
            device: Layout device type.
            sortby: Sort order.
            maxpassages: Snippet passages count.
            **kwargs: Extra custom parameters.

        Returns:
            Raw XML string response from Yandex Live.

        Raises:
            XmlStockError: If query is empty or API returns an error.

        Examples:
            >>> client = XmlStockClient(user="12345", api_key="key")
            >>> xml = client.search_yandex_live("flights to rome", lr=213)
        """
        return self._execute_search(
            "/yandexlive/xml/",
            query=query,
            lr=lr,
            groupby=groupby,
            page=page,
            domain=domain,
            filter=filter,
            device=device,
            sortby=sortby,
            maxpassages=maxpassages,
            **kwargs,
        )

    def search_google(
        self,
        query: str,
        lr: int | None = None,
        country: str | None = None,
        groupby: int | None = None,
        page: int | None = None,
        domain: str | None = None,
        safe: str | None = None,
        filter: str | None = None,
        hl: str | None = None,
        device: str | None = None,
        **kwargs: Any,
    ) -> str:
        """Performs an automated SERP search query via Google XML Search.

        Args:
            query: The search query string.
            lr: Optional region ID.
            country: Country code (e.g. 'ru', 'us', 'de').
            groupby: Results count per page.
            page: Page index starting from 0.
            domain: Search domain (e.g. 'ru', 'com').
            safe: Safe search level ('off', 'on', 'active').
            filter: Duplicate results filter ('0' or '1').
            hl: Interface language code ('ru', 'en').
            device: Layout device type ('desktop', 'mobile').
            **kwargs: Extra custom parameters.

        Returns:
            Raw XML string response from Google XML.

        Raises:
            XmlStockError: If query is empty or API returns an error.

        Examples:
            >>> client = XmlStockClient(user="12345", api_key="key")
            >>> xml = client.search_google("best python ide", domain="com")
        """
        return self._execute_search(
            "/google/xml/",
            query=query,
            lr=lr,
            country=country,
            groupby=groupby,
            page=page,
            domain=domain,
            safe=safe,
            filter=filter,
            hl=hl,
            device=device,
            **kwargs,
        )

    def get_wordstat(
        self,
        words: str | list[str],
        pagetype: str = "words",
        regions: str | int | list[int] | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Queries keyword statistics and search volumes via Yandex Wordstat API.

        Args:
            words: Single keyword or list of keywords.
            pagetype: Report type ('words', 'regions', 'dynamics').
            regions: Region IDs separated by comma or list of integer IDs.
            **kwargs: Extra custom parameters.

        Returns:
            Parsed JSON dictionary containing Wordstat results.

        Raises:
            XmlStockError: If API returns an error or request fails.

        Examples:
            >>> client = XmlStockClient(user="12345", api_key="key")
            >>> data = client.get_wordstat(["seo audit", "rank tracker"])
        """
        if isinstance(words, list):
            words_param = ",".join(str(w) for w in words)
        else:
            words_param = str(words)

        params: dict[str, Any] = {
            "user": self.user,
            "key": self.api_key,
            "words": words_param,
            "pagetype": pagetype,
            "soft_id": DEFAULT_SOFT_ID,
        }

        if regions is not None:
            if isinstance(regions, list):
                params["regions"] = ",".join(str(r) for r in regions)
            else:
                params["regions"] = str(regions)

        params.update(kwargs)

        try:
            response = self._client.get("/wordstat/json/", params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as err:
            raise XmlStockError(
                f"HTTP {err.response.status_code}: {err.response.text}",
                status=err.response.status_code,
                response_data=err.response.text,
            ) from err
        except httpx.RequestError as err:
            raise XmlStockError(f"Request failed: {err}") from err

        try:
            data = response.json()
        except ValueError as err:
            raise XmlStockError(
                f"Invalid JSON response from Wordstat: {response.text}",
                code="INVALID_RESPONSE",
                status=response.status_code,
                response_data=response.text,
            ) from err

        if isinstance(data, dict) and "error" in data:
            err_obj = data["error"]
            if isinstance(err_obj, dict):
                code = err_obj.get("code")
                msg = err_obj.get("message") or "Unknown Wordstat error"
                raise XmlStockError(
                    f"XMLStock Wordstat error: {msg}",
                    code=str(code) if code is not None else "WORDSTAT_ERROR",
                    status=response.status_code,
                    response_data=data,
                )
            raise XmlStockError(
                f"XMLStock Wordstat error: {err_obj}",
                code="WORDSTAT_ERROR",
                status=response.status_code,
                response_data=data,
            )

        return data

    def _execute_search(self, endpoint: str, query: str, **params_input: Any) -> str:
        if not query:
            raise XmlStockError("Search query cannot be empty", code="MISSING_QUERY")

        params: dict[str, Any] = {
            "user": self.user,
            "key": self.api_key,
            "query": query,
            "soft_id": DEFAULT_SOFT_ID,
        }

        for key, val in params_input.items():
            if val is not None:
                params[key] = val

        try:
            response = self._client.get(endpoint, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as err:
            raise XmlStockError(
                f"HTTP {err.response.status_code}: {err.response.text}",
                status=err.response.status_code,
                response_data=err.response.text,
            ) from err
        except httpx.RequestError as err:
            raise XmlStockError(f"Request failed: {err}") from err

        text = response.text
        self._check_xml_error(text, response.status_code)
        return text

    def _check_xml_error(self, xml: str, status: int) -> None:
        pattern = r'<error\b[^>]*code="([^"]+)"[^>]*>([\s\S]*?)</error>'
        error_match = re.search(pattern, xml, re.IGNORECASE)
        if error_match:
            code = error_match.group(1)
            msg = error_match.group(2).strip()
            raise XmlStockError(
                f"XMLStock API error ({code}): {msg}",
                code=code,
                status=status,
                response_data=xml,
            )

        if xml.startswith("ERROR_"):
            raise XmlStockError(
                f"XMLStock API error: {xml.strip()}",
                code=xml.strip(),
                status=status,
                response_data=xml,
            )
