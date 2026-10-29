"""Helpers for applying a Cloudflare 5-second clearance."""

from __future__ import annotations

from collections.abc import Mapping
from urllib.parse import urlencode

from .types import ClearanceRequest, Cloudflare5sResult
from .util import assert_page_url


def cookie_header(cookies: Mapping[str, str] | None) -> str:
    """Join cookies the way an HTTP ``Cookie`` header expects."""
    if not cookies:
        return ""
    return "; ".join(f"{key}={value}" for key, value in cookies.items() if value is not None)


def clearance_user_agent(solution: Cloudflare5sResult | Mapping[str, object]) -> str:
    """User-agent Peak says to keep using after a 5-second solve."""
    headers = solution.get("headers") if isinstance(solution, Mapping) else None
    if isinstance(headers, Mapping):
        agent = headers.get("user-agent")
        if isinstance(agent, str):
            return agent
    return ""


def build_clearance_request(target_url: str, solution: Mapping[str, object]) -> ClearanceRequest:
    """Build the POST that finishes a Cloudflare 5-second challenge.

    Peak returns cookies, a user-agent, form attributes, and ``cf_rt``.
    The target then expects those cookies, the same user-agent, a Referer of
    ``{url}?__cf_chl_tk={cf_rt}``, and ``attributes`` as a form body.
    Send that POST through the same sticky proxy you passed to the solve.
    """
    url = assert_page_url(target_url)
    raw_attributes = solution.get("attributes") or {}
    attributes = raw_attributes if isinstance(raw_attributes, Mapping) else {}
    body = urlencode({str(key): str(value) for key, value in attributes.items()})
    user_agent = clearance_user_agent(solution)
    cf_rt = solution.get("cf_rt") or ""
    referer = f"{url}?__cf_chl_tk={cf_rt}"
    raw_cookies = solution.get("cookies") or {}
    cookies = dict(raw_cookies) if isinstance(raw_cookies, Mapping) else {}
    cookie_value = cookie_header({str(k): str(v) for k, v in cookies.items()})
    headers = {
        "User-Agent": user_agent,
        "Referer": referer,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    if cookie_value:
        headers["Cookie"] = cookie_value
    return {
        "url": url,
        "method": "POST",
        "body": body,
        "cookies": {str(k): str(v) for k, v in cookies.items()},
        "cookie_header": cookie_value,
        "referer": referer,
        "user_agent": user_agent,
        "headers": headers,
    }
