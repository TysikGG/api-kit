from typing import Any


class NotLettersError(Exception):
    """Base exception for all NotLetters API errors."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        code: str | None = None,
        response_body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.response_body = response_body

    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class NotLettersBadRequestError(NotLettersError):
    """Raised on 400 Bad Request."""


class NotLettersUnauthorizedError(NotLettersError):
    """Raised on 401 Unauthorized."""


class NotLettersPaymentRequiredError(NotLettersError):
    """Raised on 402 Payment Required (e.g. insufficient funds)."""


class NotLettersForbiddenError(NotLettersError):
    """Raised on 403 Forbidden."""


class NotLettersNotFoundError(NotLettersError):
    """Raised on 404 Not Found."""


class NotLettersInternalServerError(NotLettersError):
    """Raised on 500 Internal Server Error."""


def create_notletters_error(
    status_code: int | None = None,
    data: Any = None,
    fallback_message: str = "NotLetters API error",
) -> NotLettersError:
    """Creates the appropriate NotLettersError instance from an HTTP status and payload."""
    message = fallback_message
    code: str | None = None

    if isinstance(data, str) and data.strip():
        message = data.strip()
    elif isinstance(data, dict):
        raw_msg = data.get("error") or data.get("message") or data.get("detail")
        if isinstance(raw_msg, str) and raw_msg.strip():
            message = raw_msg.strip()
        elif raw_msg is not None:
            message = str(raw_msg)

        if data.get("code") is not None:
            code = str(data["code"])
        elif isinstance(data.get("error"), str):
            code = data["error"]

    error_classes: dict[int, type[NotLettersError]] = {
        400: NotLettersBadRequestError,
        401: NotLettersUnauthorizedError,
        402: NotLettersPaymentRequiredError,
        403: NotLettersForbiddenError,
        404: NotLettersNotFoundError,
        500: NotLettersInternalServerError,
    }

    cls = error_classes.get(status_code, NotLettersError) if status_code else NotLettersError
    return cls(
        message=message,
        status_code=status_code,
        code=code,
        response_body=data,
    )
