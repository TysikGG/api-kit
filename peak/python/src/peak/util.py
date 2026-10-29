"""URL, proxy, and balance helpers."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from urllib.parse import quote, urlsplit, urlunsplit

from .errors import BadRequestError
from .types import BalanceData

_SOLVE_PROTOCOLS = {"http", "https", "socks4", "socks5", "socks5h"}
ProxyInput = str | Mapping[str, Any]


def ensure_trailing_slash(url: str) -> str:
    """Add a trailing slash to the URL path without touching the query or fragment."""
    parts = urlsplit(url)
    path = parts.path or "/"
    if not path.endswith("/"):
        path = f"{path}/"
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))


def assert_http_url(url: str, field: str = "url") -> str:
    """Require an absolute http(s) URL without rewriting the path."""
    trimmed = (url or "").strip()
    if not trimmed:
        raise BadRequestError(f"{field} is required", 0)
    parts = urlsplit(trimmed)
    if parts.scheme not in {"http", "https"} or not parts.netloc:
        if "://" not in trimmed:
            raise BadRequestError(f"{field} must be an absolute URL", 0)
        raise BadRequestError(f"{field} must use http or https", 0)
    return trimmed


def assert_page_url(url: str, field: str = "url") -> str:
    """Require an absolute http(s) page URL and normalize its trailing slash."""
    return ensure_trailing_slash(assert_http_url(url, field))


def assert_non_empty(value: str | None, field: str) -> str:
    """Reject blank strings."""
    trimmed = (value or "").strip()
    if not trimmed:
        raise BadRequestError(f"{field} is required", 0)
    return trimmed


def format_proxy(proxy: str | Mapping[str, Any]) -> str:
    """Serialize a proxy string or mapping to the form Peak expects."""
    if isinstance(proxy, str):
        trimmed = proxy.strip()
        if not trimmed:
            raise BadRequestError("Proxy is empty", 0)
        return trimmed
    return _format_proxy_config(proxy)


def _format_proxy_config(proxy: Mapping[str, object]) -> str:
    protocol = str(proxy.get("protocol") or "http").lower().rstrip(":")
    if protocol not in _SOLVE_PROTOCOLS:
        raise BadRequestError(
            f'Unsupported proxy protocol "{protocol}". '
            "Use http, https, socks4, socks5, or socks5h.",
            0,
        )
    host = _format_host(proxy.get("host"))
    port = proxy.get("port")
    if not isinstance(port, int) or isinstance(port, bool) or port < 1 or port > 65535:
        raise BadRequestError("Proxy port must be an integer from 1 to 65535", 0)
    username = proxy.get("username")
    password = proxy.get("password")
    auth = ""
    if isinstance(username, str) and username != "":
        secret = password if isinstance(password, str) else ""
        auth = f"{quote(username, safe='')}:{quote(secret, safe='')}@"
    return f"{protocol}://{auth}{host}:{port}"


def _format_host(host: object) -> str:
    text = host.strip() if isinstance(host, str) else ""
    if not text:
        raise BadRequestError("Proxy host is required", 0)
    if ":" in text and not text.startswith("["):
        return f"[{text}]"
    return text


def assert_http_proxy(proxy_url: str) -> str:
    """Validate a proxy used only to reach the Peak API. SOCKS is rejected."""
    trimmed = proxy_url.strip()
    if not trimmed:
        raise BadRequestError("http_proxy is empty", 0)
    parts = urlsplit(trimmed)
    if "://" not in trimmed or not parts.netloc:
        raise BadRequestError("http_proxy must be an absolute URL", 0)
    if parts.scheme not in {"http", "https"}:
        raise BadRequestError(
            "http_proxy must be an HTTP or HTTPS proxy URL. "
            "Pass SOCKS proxies on the solve proxy field.",
            0,
        )
    return trimmed


def format_balance(balance: BalanceData) -> str:
    """Human-readable balance line for logs and examples."""
    if balance.get("type") == "pay_per_solve":
        return f"${balance.get('balance', 0)}"
    name = balance.get("package_name") or balance.get("package") or "package"
    parts = [str(name)]
    remaining = balance.get("remaining_solves")
    if remaining is not None:
        total = balance.get("total_solves")
        suffix = f"/{total}" if total is not None else ""
        parts.append(f"{remaining}{suffix} solves left")
    days = balance.get("days_remaining")
    if days is not None:
        parts.append(f"{days} days left")
    return ", ".join(parts)


def clamp_retries(value: int | None, fallback: int) -> int:
    """Non-negative retry count. ``None`` uses the client default."""
    chosen = fallback if value is None else value
    if isinstance(chosen, bool) or not isinstance(chosen, int):
        return 0
    return max(0, chosen)
