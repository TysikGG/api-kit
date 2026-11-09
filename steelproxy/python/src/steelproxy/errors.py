from typing import Any


class SteelProxyError(Exception):
    """Base exception for all Steel Proxy API errors."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        api_status: int | None = None,
        response_body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.api_status = api_status
        self.response_body = response_body

    def __str__(self) -> str:
        code = self.status_code or self.api_status
        if code:
            return f"[{code}] {self.message}"
        return self.message


class SteelProxyUnauthorizedError(SteelProxyError):
    """Raised on 401 Unauthorized (missing or invalid API key)."""


class SteelProxyPaymentRequiredError(SteelProxyError):
    """Raised on 402 Payment Required (insufficient balance)."""


class SteelProxyForbiddenError(SteelProxyError):
    """Raised on 403 Forbidden (account blocked by administrator)."""


class SteelProxyNotFoundError(SteelProxyError):
    """Raised on 404 Not Found (order, tariff, or location not found)."""


class SteelProxyConflictError(SteelProxyError):
    """Raised on 409 Conflict (no available proxies at location / out of stock)."""


class SteelProxyValidationError(SteelProxyError):
    """Raised on 422 Unprocessable Entity (parameter validation error)."""


class SteelProxyBadGatewayError(SteelProxyError):
    """Raised on 502 Bad Gateway (failure provisioning proxy on node)."""


def create_steelproxy_error(
    status_code: int | None = None,
    data: Any = None,
    fallback_message: str = "Steel Proxy API error",
) -> SteelProxyError:
    """Creates the appropriate SteelProxyError instance based on HTTP status and body."""
    message = fallback_message
    api_status: int | None = None

    if isinstance(data, str) and data.strip():
        message = data.strip()
    elif isinstance(data, dict):
        raw_msg = data.get("message") or data.get("detail")
        if isinstance(raw_msg, str) and raw_msg.strip():
            message = raw_msg.strip()
        elif isinstance(raw_msg, list):
            message = "; ".join(
                str(item.get("msg", item)) if isinstance(item, dict) else str(item)
                for item in raw_msg
            )
        elif raw_msg is not None:
            message = str(raw_msg)

        if isinstance(data.get("status"), int):
            api_status = data["status"]

    effective_status = status_code or api_status
    error_classes: dict[int, type[SteelProxyError]] = {
        401: SteelProxyUnauthorizedError,
        402: SteelProxyPaymentRequiredError,
        403: SteelProxyForbiddenError,
        404: SteelProxyNotFoundError,
        409: SteelProxyConflictError,
        422: SteelProxyValidationError,
        502: SteelProxyBadGatewayError,
    }

    if effective_status and effective_status in error_classes:
        cls = error_classes[effective_status]
    else:
        cls = SteelProxyError
    return cls(
        message=message,
        status_code=status_code,
        api_status=api_status,
        response_body=data,
    )
