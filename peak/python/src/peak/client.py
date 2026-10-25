"""Client for the Peak Solutions CAPTCHA solving API."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import httpx

from .errors import PeakError
from .types import BalanceData, Cloudflare5sResult, TurnstileResult

_DEFAULT_BASE_URL = "https://api.peak.fo"
_DEFAULT_TIMEOUT = 60.0

APP_ID = "app_05c1f418153804ec393a7211"


class Peak:
    """Client for the Peak CAPTCHA solving API.

    Args:
        api_key: Peak API key (`pk_...`).
        base_url: Custom API base URL (defaults to `https://api.peak.fo`).
        timeout: Request timeout in seconds (defaults to 60.0).

    Examples:
        >>> from peak import Peak
        >>> with Peak("pk_...") as client:
        ...     balance = client.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        if not api_key or not api_key.strip():
            raise PeakError("API key is required", 0)

        self._api_key = api_key.strip()
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={
                "X-API-Key": self._api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> Peak:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def get_balance(self) -> BalanceData:
        """Retrieve current account balance or package status.

        Returns:
            Balance data for pay-per-solve or package accounts.

        Examples:
            >>> with Peak("pk_...") as client:
            ...     balance = client.get_balance()
            ...     print(balance["type"])
        """
        response = self._request("GET", "/balance")
        if not response.get("success") or "data" not in response:
            raise PeakError("Failed to retrieve balance", 200, response)
        return response["data"]

    def solve_turnstile(
        self,
        url: str,
        sitekey: str,
        *,
        proxy: str | None = None,
        action: str | None = None,
        cdata: str | None = None,
    ) -> TurnstileResult:
        """Solve a Cloudflare Turnstile challenge.

        Uses ``TurnstileTaskProxyLess`` when proxy is omitted, or
        ``turnstiletask`` when a proxy is provided.

        Args:
            url: Target page URL (recommended with trailing slash).
            sitekey: Turnstile sitekey.
            proxy: Proxy in ``http://user:pass@ip:port`` format.
            action: Turnstile action parameter.
            cdata: Turnstile cdata parameter.

        Returns:
            Dictionary containing the ``token`` string.

        Examples:
            >>> with Peak("pk_...") as client:
            ...     res = client.solve_turnstile("https://example.com/", "0x4AAAAAAA...")
            ...     print(res["token"])
        """
        task_type = "turnstiletask" if proxy else "TurnstileTaskProxyLess"
        payload: dict[str, Any] = {
            "task_type": task_type,
            "url": url,
            "sitekey": sitekey,
        }
        if proxy:
            payload["proxy"] = proxy
        if action:
            payload["action"] = action
        if cdata:
            payload["cdata"] = cdata

        return self.solve(payload)

    def solve_cloudflare_5s(
        self,
        url: str,
        proxy: str,
        *,
        user_agent: str | None = None,
        html: str | None = None,
    ) -> Cloudflare5sResult:
        """Solve a Cloudflare 5-second challenge (WAF / Under Attack mode).

        Args:
            url: Target page URL (must end with trailing slash ``/``).
            proxy: Sticky proxy in ``http://user:pass@ip:port`` format.
            user_agent: Windows Chrome user-agent string.
            html: Pre-fetched HTML string to skip initial fetch.

        Returns:
            Dictionary with cookies, headers, attributes, and ``cf_rt``.

        Examples:
            >>> with Peak("pk_...") as client:
            ...     res = client.solve_cloudflare_5s("https://example.com/", "http://user:pass@ip:port")
            ...     print(res["cookies"])
        """
        payload: dict[str, Any] = {
            "task_type": "cloudflare5stask",
            "url": url,
            "proxy": proxy,
        }
        if user_agent:
            payload["user_agent"] = user_agent
        if html:
            payload["html"] = html

        return self.solve(payload)

    def solve(self, task: Mapping[str, Any]) -> Any:
        """Send a raw solve request with any task payload.

        Automatically attaches the application identifier.

        Args:
            task: Task dictionary containing task parameters.

        Returns:
            Extracted ``data`` field from the API response.
        """
        payload = dict(task)
        payload["appId"] = APP_ID

        response = self._request("POST", "/solve", json_data=payload)

        if not response.get("success") or response.get("error"):
            error_msg = response.get("error") or "Solve task failed"
            raise PeakError(error_msg, 200, response)

        if "data" not in response:
            raise PeakError("Missing response data from Peak API", 200, response)

        return response["data"]

    def _request(
        self,
        method: str,
        path: str,
        *,
        json_data: Any = None,
    ) -> dict[str, Any]:
        try:
            res = self._http.request(method, path, json=json_data)
        except httpx.HTTPError as err:
            raise PeakError(str(err), 0) from err

        try:
            data = res.json()
        except ValueError:
            data = None

        if res.is_error:
            error_msg = (
                data.get("error")
                if isinstance(data, dict) and data.get("error")
                else res.text or f"HTTP {res.status_code}"
            )
            raise PeakError(error_msg, res.status_code, data)

        if not isinstance(data, dict):
            raise PeakError("Unexpected non-JSON response from Peak API", res.status_code, res.text)

        return data
