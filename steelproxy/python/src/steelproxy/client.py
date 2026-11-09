import os
from typing import Any
from urllib.parse import urlencode, urljoin

import httpx

from .errors import SteelProxyError, create_steelproxy_error
from .types import (
    CreatedOrder,
    ExtendedOrder,
    LocationItem,
    OrderDetail,
    OrderList,
    PriceItem,
    ProxyType,
    ProxyTypeItem,
    RotationMode,
)

DEFAULT_BASE_URL = "https://api.steelproxy.com/v1"


class SteelProxy:
    """Client for the Steel Proxy Reseller and Franchise API.

    Attributes:
        api_key: Reseller API authentication key.
        base_url: Base URL of the API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the SteelProxy client.

        Args:
            api_key: Steel Proxy API key. Defaults to STEELPROXY_API_KEY
                environment variable.
            base_url: Base URL for the API. Defaults to https://api.steelproxy.com/v1.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.

        Examples:
            >>> from steelproxy import SteelProxy
            >>> client = SteelProxy(api_key="sp_live_key")
            >>> types = client.get_proxy_types()
            >>> print(types)
        """
        self.api_key = api_key or os.environ.get("STEELPROXY_API_KEY")
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        ua = user_agent or "steelproxy/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "SteelProxy":
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

            try:
                data = response.json()
            except Exception:
                data = response.text

            if response.status_code >= 400:
                raise create_steelproxy_error(
                    status_code=response.status_code,
                    data=data,
                    fallback_message=f"HTTP {response.status_code} error",
                )

            if isinstance(data, dict):
                status_val = data.get("status")
                if isinstance(status_val, int) and status_val >= 400:
                    raise create_steelproxy_error(
                        status_code=status_val,
                        data=data,
                    )
                if "data" in data:
                    return data["data"]

            return data
        except httpx.HTTPStatusError as e:
            try:
                data = e.response.json()
            except Exception:
                data = e.response.text
            raise create_steelproxy_error(
                status_code=e.response.status_code,
                data=data,
                fallback_message=str(e),
            ) from e
        except httpx.RequestError as e:
            raise SteelProxyError(f"HTTP request failed: {e}") from e

    def get_proxy_types(self) -> list[ProxyTypeItem]:
        """Retrieves available proxy categories (server, residential, rotation).

        Returns:
            List of proxy categories with code and title.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     types = client.get_proxy_types()
            ...     for t in types:
            ...         print(t["code"], t["title"])
        """
        return self._request("GET", "/proxy-types")

    def get_locations(
        self,
        proxy_type: str | ProxyType | None = None,
    ) -> list[LocationItem]:
        """Retrieves available locations (nodes) with supported lease terms.

        Args:
            proxy_type: Optional filter by proxy type code.

        Returns:
            List of locations with node_id, country_code, title, and terms_days.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     locs = client.get_locations(proxy_type="residential")
            ...     for loc in locs:
            ...         print(loc["title"], loc["terms_days"])
        """
        params: dict[str, Any] = {}
        if proxy_type is not None:
            params["proxy_type"] = str(proxy_type)
        return self._request("GET", "/locations", params=params if params else None)

    def get_terms(
        self,
        proxy_type: str | ProxyType | None = None,
    ) -> list[int]:
        """Retrieves flat list of all available duration terms in days.

        Args:
            proxy_type: Optional filter by proxy type code.

        Returns:
            List of available lease durations in days (e.g. [1, 7, 14, 30]).

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     terms = client.get_terms()
            ...     print(terms)
        """
        params: dict[str, Any] = {}
        if proxy_type is not None:
            params["proxy_type"] = str(proxy_type)
        return self._request("GET", "/terms", params=params if params else None)

    def get_prices(
        self,
        proxy_type: str | ProxyType | None = None,
        country_code: str | None = None,
    ) -> list[PriceItem]:
        """Retrieves reseller purchase prices with personal discount applied.

        Args:
            proxy_type: Optional filter by proxy category code.
            country_code: Optional ISO two-letter country code filter.

        Returns:
            List of price items with rates and currencies.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     prices = client.get_prices(country_code="US")
            ...     for p in prices:
            ...         print(f"{p['price']} {p['currency']}")
        """
        params: dict[str, Any] = {}
        if proxy_type is not None:
            params["proxy_type"] = str(proxy_type)
        if country_code is not None:
            params["country_code"] = country_code
        return self._request("GET", "/prices", params=params if params else None)

    def create_order(
        self,
        proxy_type: str | ProxyType,
        node_id: int,
        term_days: int,
        quantity: int,
        *,
        buyer_reference: str | None = None,
        rotation_mode: str | RotationMode | None = None,
        timer_interval_minutes: int | None = None,
    ) -> CreatedOrder:
        """Creates an order, deducts cost from balance, and returns allocated proxies.

        Args:
            proxy_type: Proxy type code (e.g. "server", "residential", "rotation").
            node_id: Location node identifier (see get_locations()).
            term_days: Duration in days.
            quantity: Number of proxies (1-1000).
            buyer_reference: Optional reseller customer/order identifier.
            rotation_mode: "timer" or "link" for proxy_type=rotation.
            timer_interval_minutes: Minutes interval when rotation_mode="timer".

        Returns:
            Details of created order with provisioned proxy credentials.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     order = client.create_order(
            ...         proxy_type="residential",
            ...         node_id=5,
            ...         term_days=7,
            ...         quantity=2,
            ...     )
            ...     print(order["order_id"], order["price"])
        """
        if not proxy_type:
            raise SteelProxyError("proxy_type is required")
        if not isinstance(node_id, int):
            raise SteelProxyError("node_id must be an integer")
        if not isinstance(term_days, int) or term_days <= 0:
            raise SteelProxyError("term_days must be a positive integer")
        if not isinstance(quantity, int) or quantity <= 0:
            raise SteelProxyError("quantity must be a positive integer")

        payload: dict[str, Any] = {
            "proxy_type": str(proxy_type),
            "node_id": node_id,
            "term_days": term_days,
            "quantity": quantity,
        }
        if buyer_reference is not None:
            payload["buyer_reference"] = buyer_reference
        if rotation_mode is not None:
            payload["rotation_mode"] = str(rotation_mode)
        if timer_interval_minutes is not None:
            payload["timer_interval_minutes"] = timer_interval_minutes

        return self._request("POST", "/orders", json_data=payload)

    def get_order(self, order_id: int) -> OrderDetail:
        """Retrieves details of an existing order and its proxy credentials.

        Args:
            order_id: Unique order identifier.

        Returns:
            Order details dictionary.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     order = client.get_order(118432)
            ...     print(order["status"], len(order["proxies"]))
        """
        if not isinstance(order_id, int):
            raise SteelProxyError("order_id must be an integer")
        return self._request("GET", f"/orders/{order_id}")

    def get_orders(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> OrderList:
        """Retrieves a paginated list of reseller orders.

        Args:
            page: Page number, starting at 1 (default: 1).
            page_size: Number of items per page (default: 20, max: 100).

        Returns:
            OrderList dictionary with total, page, page_size, and items.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     orders = client.get_orders(page=1, page_size=20)
            ...     print(f"Total: {orders['total']}")
        """
        params = {"page": page, "page_size": page_size}
        return self._request("GET", "/orders", params=params)

    def extend_order(self, order_id: int, months: int) -> ExtendedOrder:
        """Extends duration of proxies in an existing order.

        Args:
            order_id: Order ID to extend.
            months: Number of months to extend: 1, 2, 3, or 6.

        Returns:
            Extension confirmation with new expiration timestamp.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     res = client.extend_order(118432, months=1)
            ...     print(res["expires_at"], res["balance_after"])
        """
        if not isinstance(order_id, int):
            raise SteelProxyError("order_id must be an integer")
        if not isinstance(months, int):
            raise SteelProxyError("months must be an integer")

        return self._request("POST", f"/orders/{order_id}/extend", json_data={"months": months})

    def create_order_webhook(
        self,
        proxy_type: str,
        country_code: str,
        term_days: int,
        *,
        count: int = 1,
        buyer: str | None = None,
        user: str | None = None,
        rotation_mode: str | None = None,
        timer_interval: int | None = None,
        api_key: str | None = None,
    ) -> CreatedOrder:
        """Creates an order via the webhook endpoint used by automated sales platforms.

        Args:
            proxy_type: Proxy type code (e.g. "residential").
            country_code: Country code (e.g. "US").
            term_days: Lease duration in days.
            count: Number of proxies to purchase (default: 1).
            buyer: Buyer reference identifier.
            user: Alternative user reference for bot platforms.
            rotation_mode: Optional rotation mode ("timer" or "link").
            timer_interval: Rotation timer interval in minutes.
            api_key: Optional API key override.

        Returns:
            Created order details.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     order = client.create_order_webhook(
            ...         proxy_type="residential",
            ...         country_code="US",
            ...         term_days=7,
            ...         count=2,
            ...     )
        """
        key = api_key or self.api_key
        if not key:
            raise SteelProxyError("api_key is required for webhook creation")
        if not proxy_type:
            raise SteelProxyError("proxy_type is required")
        if not country_code:
            raise SteelProxyError("country_code is required")
        if not isinstance(term_days, int) or term_days <= 0:
            raise SteelProxyError("term_days must be a positive integer")

        p_type = proxy_type.value if hasattr(proxy_type, "value") else str(proxy_type)
        params: dict[str, Any] = {
            "api_key": key,
            "proxy_type": p_type,
            "country_code": country_code,
            "term_days": term_days,
        }
        if rotation_mode is not None:
            r_mode = rotation_mode.value if hasattr(rotation_mode, "value") else str(rotation_mode)
            params["rotation_mode"] = r_mode
        if timer_interval is not None:
            params["timer_interval"] = timer_interval

        body: dict[str, Any] = {"count": count}
        if buyer is not None:
            body["buyer"] = buyer
        if user is not None:
            body["user"] = user

        return self._request("POST", "/orders/webhook", params=params, json_data=body)

    def build_webhook_url(
        self,
        proxy_type: str | ProxyType,
        country_code: str,
        term_days: int,
        *,
        rotation_mode: str | RotationMode | None = None,
        timer_interval: int | None = None,
        api_key: str | None = None,
    ) -> str:
        """Constructs a static webhook URL for marketplace/bot platform integration.

        Args:
            proxy_type: Proxy type code.
            country_code: Country code.
            term_days: Lease term in days.
            rotation_mode: Optional rotation mode.
            timer_interval: Optional timer interval.
            api_key: Optional API key override.

        Returns:
            Full webhook URL string.

        Examples:
            >>> with SteelProxy("sp_live_key") as client:
            ...     url = client.build_webhook_url(
            ...         proxy_type="residential",
            ...         country_code="US",
            ...         term_days=7,
            ...     )
            ...     print(url)
        """
        key = api_key or self.api_key
        if not key:
            raise SteelProxyError("api_key is required to build webhook URL")

        p_type = proxy_type.value if hasattr(proxy_type, "value") else str(proxy_type)
        params: dict[str, Any] = {
            "api_key": key,
            "proxy_type": p_type,
            "country_code": country_code,
            "term_days": term_days,
        }
        if rotation_mode is not None:
            r_mode = rotation_mode.value if hasattr(rotation_mode, "value") else str(rotation_mode)
            params["rotation_mode"] = r_mode
        if timer_interval is not None:
            params["timer_interval"] = timer_interval

        base = self.base_url.rstrip("/")
        return f"{base}/orders/webhook?{urlencode(params)}"

    def health(self) -> dict[str, Any]:
        """Checks API server health status.

        Returns:
            Dictionary containing health status (e.g. {"status": "ok"}).

        Examples:
            >>> with SteelProxy() as client:
            ...     res = client.health()
            ...     print(res["status"])
        """
        origin = urljoin(self.base_url, "/")
        with httpx.Client(base_url=origin, timeout=self._client.timeout) as raw_client:
            resp = raw_client.get("/health")
            resp.raise_for_status()
            return resp.json()
