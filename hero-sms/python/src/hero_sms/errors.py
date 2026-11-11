"""Exceptions and error handling for HeroSMS."""

from __future__ import annotations

import json
from typing import Any


class HeroSMSError(Exception):
    """Base exception for all HeroSMS API errors."""

    def __init__(self, code: str, message: str, raw_response: str = "") -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.raw_response = raw_response

    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message


class NoNumbersError(HeroSMSError):
    """Raised when no phone numbers are available."""

    def __init__(self, raw_response: str = "NO_NUMBERS") -> None:
        super().__init__(
            code="NO_NUMBERS",
            message="No numbers available for the requested service and country",
            raw_response=raw_response,
        )


class AuthenticationError(HeroSMSError):
    """Raised when API key is missing or invalid."""

    def __init__(self, code: str = "BAD_KEY", raw_response: str = "") -> None:
        msg = "API key is missing" if code == "NO_KEY" else "Invalid API key"
        super().__init__(code=code, message=msg, raw_response=raw_response or code)


class ActivationNotFoundError(HeroSMSError):
    """Raised when activation ID is not found."""

    def __init__(self, raw_response: str = "NO_ACTIVATION") -> None:
        super().__init__(
            code="NO_ACTIVATION",
            message="Activation not found",
            raw_response=raw_response,
        )


class EarlyCancelError(HeroSMSError):
    """Raised when trying to cancel within the first 2 minutes."""

    def __init__(self, raw_response: str = "EARLY_CANCEL_DENIED") -> None:
        super().__init__(
            code="EARLY_CANCEL_DENIED",
            message="Cannot cancel activation within the first 2 minutes",
            raw_response=raw_response,
        )


class WrongMaxPriceError(HeroSMSError):
    """Raised when specified max price is lower than minimum allowed."""

    def __init__(self, raw_response: str, minimum_price: float = 0.0) -> None:
        super().__init__(
            code="WRONG_MAX_PRICE",
            message=f"Maximum price is too low. Minimum price: {minimum_price}",
            raw_response=raw_response,
        )
        self.minimum_price = minimum_price


class BannedError(HeroSMSError):
    """Raised when account is banned."""

    def __init__(self, raw_response: str, banned_until: str = "unknown") -> None:
        super().__init__(
            code="BANNED",
            message=f"Account is banned until {banned_until}",
            raw_response=raw_response,
        )
        self.banned_until = banned_until


class AccountInactiveError(HeroSMSError):
    """Raised when account is inactive."""

    def __init__(self, raw_response: str = "ACCOUNT_INACTIVE") -> None:
        super().__init__(
            code="ACCOUNT_INACTIVE",
            message="Account is inactive. Please activate your account.",
            raw_response=raw_response,
        )


class ChannelsLimitError(HeroSMSError):
    """Raised when concurrent thread / channel limit is reached."""

    def __init__(
        self,
        raw_response: str = "CHANNELS_LIMIT",
        current_threads: int | None = None,
        max_allowed: int | None = None,
    ) -> None:
        super().__init__(
            code="CHANNELS_LIMIT",
            message="Account channels limit reached",
            raw_response=raw_response,
        )
        self.current_threads = current_threads
        self.max_allowed = max_allowed


class NoBalanceError(HeroSMSError):
    """Raised when account balance is insufficient."""

    def __init__(self, raw_response: str = "NO_BALANCE") -> None:
        super().__init__(
            code="NO_BALANCE",
            message="Insufficient account balance",
            raw_response=raw_response,
        )


class ApiJsonError(HeroSMSError):
    """Raised when server returns a structured JSON error response."""

    def __init__(
        self,
        title: str,
        details: str,
        info: dict[str, Any] | None = None,
        raw_response: str = "",
    ) -> None:
        super().__init__(code=title, message=details, raw_response=raw_response)
        self.title = title
        self.details = details
        self.info = info or {}


ERROR_MESSAGES: dict[str, str] = {
    "BAD_ACTION": "Incorrect action specified",
    "BAD_KEY": "Incorrect API key",
    "NO_KEY": "API key is missing",
    "ERROR_SQL": "Server database error",
    "BAD_SERVICE": "Incorrect service specified",
    "BAD_STATUS": "Incorrect status specified",
    "NO_NUMBERS": "No numbers available",
    "NO_ACTIVATION": "Activation not found",
    "WRONG_ACTIVATION_ID": "Invalid activation ID",
    "WRONG_MAX_PRICE": "Maximum price is too low",
    "EARLY_CANCEL_DENIED": "Cannot cancel within first 2 minutes",
    "CHANNELS_LIMIT": "Account channels limit reached",
    "OPERATORS_NOT_FOUND": "No operators found",
    "ORDER_ALREADY_EXISTS": "Order already exists",
    "NO_ACTIVATIONS": "No activations found",
    "ACCOUNT_INACTIVE": "Account is inactive",
    "SERVICE_NOT_AVAILABLE": "Service is not available",
    "SIM_OFFLINE": "SIM card is offline",
    "NO_BALANCE": "Insufficient balance",
    "UNPROCESSABLE_ENTITY": "Validation failed",
    "FREE_CANCELLATION_EXPIRED": "Free cancellation period expired",
    "OTP_RECEIVED": "OTP already received",
    "NEW_OTP_RECEIVED": "New OTP received",
    "ACTIVATION_NOT_ACTIVE": "Activation is not active",
    "FINISHED": "Activation already finished",
    "REFUNDED": "Activation was refunded",
    "CANCELED": "Activation was canceled",
    "BAD_DURATION": "Invalid rental duration",
    "WRONG_COUNTRY": "Invalid country specified",
    "WRONG_SERVICE": "Invalid service specified",
    "WRONG_CURRENCY": "Invalid currency specified",
    "NOT_FOUND": "Resource not found",
    "SERVER_ERROR": "Internal server error",
    "BANNED": "Account is banned",
}


def check_for_errors(text: str) -> None:
    """Inspect text response for known error codes and raise appropriate error."""
    if text.startswith("BANNED:"):
        parts = text.split(":", 1)
        banned_until = parts[1] if len(parts) > 1 else "unknown"
        raise BannedError(text, banned_until)

    if text.startswith("WRONG_MAX_PRICE:"):
        parts = text.split(":", 1)
        min_price = float(parts[1]) if len(parts) > 1 and parts[1] else 0.0
        raise WrongMaxPriceError(text, min_price)

    if text == "NO_NUMBERS":
        raise NoNumbersError(text)
    if text in ("BAD_KEY", "NO_KEY"):
        raise AuthenticationError(text, text)
    if text == "NO_ACTIVATION":
        raise ActivationNotFoundError(text)
    if text == "EARLY_CANCEL_DENIED":
        raise EarlyCancelError(text)
    if text == "CHANNELS_LIMIT":
        raise ChannelsLimitError(text)
    if text == "NO_BALANCE":
        raise NoBalanceError(text)
    if text == "ACCOUNT_INACTIVE":
        raise AccountInactiveError(text)

    for code in ERROR_MESSAGES:
        if text == code or text.startswith(f"{code}:"):
            raise HeroSMSError(code, ERROR_MESSAGES.get(code, code), text)


def is_json_error(data: Any) -> bool:
    """Check if decoded JSON response is an error payload."""
    return isinstance(data, dict) and "title" in data and "details" in data


def check_for_json_errors(data: dict[str, Any]) -> None:
    """Inspect JSON dictionary for error payloads and raise appropriate error."""
    title = str(data.get("title", ""))
    details = str(data.get("details", ""))
    info = data.get("info") if isinstance(data.get("info"), dict) else {}
    raw = json.dumps(data)

    if title == "NO_NUMBERS":
        raise NoNumbersError(raw)
    if title in ("BAD_KEY", "NO_KEY"):
        raise AuthenticationError(title, raw)
    if title == "NO_ACTIVATION":
        raise ActivationNotFoundError(raw)
    if title == "EARLY_CANCEL_DENIED":
        raise EarlyCancelError(raw)
    if title == "WRONG_MAX_PRICE":
        min_price = float(info.get("min", 0.0))
        raise WrongMaxPriceError(raw, min_price)
    if title == "BANNED":
        readable = str(info.get("readable_date", "unknown"))
        raise BannedError(raw, readable)
    if title == "CHANNELS_LIMIT":
        raise ChannelsLimitError(
            raw,
            current_threads=info.get("current_threads"),
            max_allowed=info.get("max_allowed"),
        )
    if title == "ACCOUNT_INACTIVE":
        raise AccountInactiveError(raw)
    if title == "NO_BALANCE":
        raise NoBalanceError(raw)

    raise ApiJsonError(title=title, details=details, info=info, raw_response=raw)
