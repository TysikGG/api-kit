"""Type definitions for the Peak API client."""

from __future__ import annotations

from typing import Any, Literal, TypedDict


class PayPerSolveBalance(TypedDict):
    """Pay-per-solve balance details."""

    type: Literal["pay_per_solve"]
    balance: float


class PackageBalance(TypedDict, total=False):
    """Package balance.

    Older responses use ``package``. Current responses use ``package_name``,
    ``remaining_solves``, ``total_solves``, and ``allowed_tasks``.
    """

    type: Literal["package"]
    package: str
    package_name: str
    remaining_solves: int
    total_solves: int
    allowed_tasks: list[str]
    expires_at: str
    days_remaining: int


BalanceData = PayPerSolveBalance | PackageBalance


class TurnstileResult(TypedDict):
    """Result of solving a Cloudflare Turnstile challenge."""

    token: str


class Cloudflare5sAttributes(TypedDict):
    """Challenge form attributes to POST to the target URL."""

    md: str
    r: str


class Cloudflare5sResult(TypedDict):
    """Result of solving a Cloudflare 5-second challenge."""

    cookies: dict[str, str]
    headers: dict[str, str]
    attributes: Cloudflare5sAttributes
    cf_rt: str


class AwsWafResult(TypedDict):
    """Result of an AWS WAF mobile-SDK solve."""

    token: str


class ProxyConfig(TypedDict, total=False):
    """Structured proxy serialized to ``scheme://user:pass@host:port``."""

    protocol: Literal["http", "https", "socks4", "socks5", "socks5h"]
    host: str
    port: int
    username: str
    password: str


class SolveEvent(TypedDict):
    """Emitted after a solve returns ``success: true``."""

    task_type: str
    data: Any


class ClearanceRequest(TypedDict):
    """Request pieces for finishing a Cloudflare 5-second challenge."""

    url: str
    method: Literal["POST"]
    headers: dict[str, str]
    body: str
    cookies: dict[str, str]
    cookie_header: str
    referer: str
    user_agent: str


class RawApiResponse(TypedDict, total=False):
    """Envelope returned by Peak API endpoints."""

    success: bool
    data: Any
    error: str
