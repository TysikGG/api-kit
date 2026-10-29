"""Payload builders and response readers shared by the sync and async clients."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from .constants import (
    APP_ID,
    TASK_AWS_WAF,
    TASK_CLOUDFLARE_5S,
    TASK_TURNSTILE,
    TASK_TURNSTILE_PROXYLESS,
)
from .errors import BadRequestError, PeakError, classify_error
from .types import BalanceData
from .util import assert_http_url, assert_non_empty, assert_page_url, format_proxy

ProxyLike = str | Mapping[str, Any]


def attach_app_id(task: Mapping[str, Any]) -> dict[str, Any]:
    """Copy a solve body and force the library app id.

    Any ``appId`` already in ``task`` is replaced. The attribution default is fixed.
    """
    payload = dict(task)
    payload["appId"] = APP_ID
    return payload


def build_turnstile(
    url: str,
    sitekey: str,
    *,
    proxy: ProxyLike | None = None,
    action: str | None = None,
    cdata: str | None = None,
    task_type: str | None = None,
) -> dict[str, Any]:
    """Build a Turnstile solve body. A proxy selects the proxied task type."""
    chosen = (task_type or "").strip()
    if not chosen:
        chosen = TASK_TURNSTILE if proxy else TASK_TURNSTILE_PROXYLESS
    payload: dict[str, Any] = {
        "task_type": chosen,
        "url": assert_page_url(url),
        "sitekey": assert_non_empty(sitekey, "sitekey"),
    }
    if proxy:
        payload["proxy"] = format_proxy(proxy)
    if action:
        payload["action"] = action
    if cdata:
        payload["cdata"] = cdata
    return payload


def build_cloudflare_5s(
    url: str,
    proxy: ProxyLike,
    *,
    user_agent: str | None = None,
    html: str | None = None,
    task_type: str | None = None,
) -> dict[str, Any]:
    """Build a Cloudflare 5-second challenge body."""
    payload: dict[str, Any] = {
        "task_type": (task_type or "").strip() or TASK_CLOUDFLARE_5S,
        "url": assert_page_url(url),
        "proxy": format_proxy(proxy),
    }
    if user_agent:
        payload["user_agent"] = user_agent
    if html:
        payload["html"] = html
    return payload


def build_aws_waf(
    url: str,
    sdk_url: str,
    proxy: ProxyLike,
    user_agent: str,
    *,
    os: str = "ios",
    task_type: str | None = None,
) -> dict[str, Any]:
    """Build an AWS WAF mobile-SDK body."""
    if os not in {"ios", "android"}:
        raise BadRequestError("os must be 'ios' or 'android'", 0)
    return {
        "task_type": (task_type or "").strip() or TASK_AWS_WAF,
        "url": assert_page_url(url),
        "sdk_url": assert_http_url(sdk_url, "sdk_url"),
        "proxy": format_proxy(proxy),
        "user_agent": assert_non_empty(user_agent, "user_agent"),
        "os": os,
    }


def read_balance(body: Any) -> BalanceData:
    """Unwrap a balance envelope."""
    _assert_object(body)
    if body.get("success") is not True or body.get("error"):
        raise classify_error(body.get("error") or "Failed to retrieve balance", 200, body)
    data = body.get("data")
    if data is None:
        raise PeakError("Failed to retrieve balance", 200, body)
    return data  # type: ignore[no-any-return]


def read_solve(body: Any) -> Any:
    """Unwrap a solve envelope."""
    _assert_object(body)
    if body.get("success") is not True or body.get("error"):
        raise classify_error(body.get("error") or "Solve task failed", 200, body)
    if "data" not in body or body.get("data") is None:
        raise PeakError("Missing response data from Peak API", 200, body)
    return body["data"]


def _assert_object(body: Any) -> None:
    if not isinstance(body, dict):
        raise PeakError("Unexpected non-JSON response from Peak API", 200, body)
