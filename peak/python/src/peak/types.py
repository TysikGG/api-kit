"""Type definitions for the Peak API client."""

from __future__ import annotations

from typing import Any, Literal, TypedDict


class PayPerSolveBalance(TypedDict):
    """Pay-per-solve balance details."""

    type: Literal["pay_per_solve"]
    balance: float


class PackageBalance(TypedDict):
    """Package / subscription balance details."""

    type: Literal["package"]
    package: str
    expires_at: str
    days_remaining: int


BalanceData = PayPerSolveBalance | PackageBalance


class TurnstileResult(TypedDict):
    """Result of solving a Cloudflare Turnstile challenge."""

    token: str


class Cloudflare5sAttributes(TypedDict):
    """Challenge form attributes to POST to target URL."""

    md: str
    r: str


class Cloudflare5sResult(TypedDict):
    """Result of solving a Cloudflare 5-second challenge."""

    cookies: dict[str, str]
    headers: dict[str, str]
    attributes: Cloudflare5sAttributes
    cf_rt: str


class RawApiResponse(TypedDict, total=False):
    """Envelope returned by Peak API endpoints."""

    success: bool
    data: Any
    error: str
