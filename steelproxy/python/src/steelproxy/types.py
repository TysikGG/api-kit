from enum import Enum
from typing import Any, TypedDict


class ProxyType(str, Enum):
    """Supported proxy categories."""

    SERVER = "server"
    RESIDENTIAL = "residential"
    ROTATION = "rotation"


class RotationMode(str, Enum):
    """IP rotation modes for rotating proxies."""

    TIMER = "timer"
    LINK = "link"


class OrderStatus(str, Enum):
    """Order statuses."""

    ACTIVE = "active"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class ProxyTypeItem(TypedDict):
    """Proxy category item."""

    code: str
    title: str


class LocationItem(TypedDict):
    """Location / node catalog item."""

    node_id: int
    country_code: str
    title: str
    proxy_type: str
    terms_days: list[int]


class PriceItem(TypedDict):
    """Reseller wholesale price item."""

    proxy_type: str
    country_code: str
    node_id: int
    term_days: int
    price: str
    currency: str


class ProxyCredentials(TypedDict, total=False):
    """Connection details for an allocated proxy."""

    username: str
    password: str
    host: str
    http_port: str
    socks5_port: str
    connection_string_http: str
    connection_string_socks5: str
    rotate_link: str | None


class CreatedOrder(TypedDict, total=False):
    """Result of order creation."""

    order_id: int
    created_at: str
    expires_at: str
    proxy_type: str
    location: str
    term_days: int
    quantity: int
    price: str
    currency: str
    balance_after: str
    proxies: list[ProxyCredentials]
    rotation_mode: str | None
    timer_interval_minutes: int | None


class OrderDetail(TypedDict, total=False):
    """Full order information."""

    order_id: int
    status: str
    proxy_type: str
    location: str
    term_days: int
    quantity: int
    price: str
    currency: str
    created_at: str
    expires_at: str | None
    buyer_reference: str | None
    proxies: list[ProxyCredentials]
    rotation_mode: str | None
    timer_interval_minutes: int | None


class OrderListItem(TypedDict, total=False):
    """Summary item in paginated orders list."""

    order_id: int
    status: str
    proxy_type: str
    location: str
    term_days: int
    quantity: int
    price: str
    currency: str
    created_at: str
    buyer_reference: str | None


class OrderList(TypedDict):
    """Paginated orders list."""

    total: int
    page: int
    page_size: int
    items: list[OrderListItem]


class ExtendedOrder(TypedDict):
    """Result of extending an order."""

    order_id: int
    months: int
    price: str
    currency: str
    previous_expires_at: str
    expires_at: str
    balance_after: str


class APIResponse(TypedDict, total=False):
    """Generic API response envelope."""

    status: int
    message: str
    data: Any
