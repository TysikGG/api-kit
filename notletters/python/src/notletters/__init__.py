from .client import NotLetters
from .errors import (
    NotLettersBadRequestError,
    NotLettersError,
    NotLettersForbiddenError,
    NotLettersInternalServerError,
    NotLettersNotFoundError,
    NotLettersPaymentRequiredError,
    NotLettersUnauthorizedError,
    create_notletters_error,
)
from .types import (
    ChangePasswordResult,
    EmailType,
    Letter,
    LetterBody,
    LetterFilters,
    Mail,
    UserData,
    parse_mail,
)

__all__ = [
    "ChangePasswordResult",
    "EmailType",
    "Letter",
    "LetterBody",
    "LetterFilters",
    "Mail",
    "NotLetters",
    "NotLettersBadRequestError",
    "NotLettersError",
    "NotLettersForbiddenError",
    "NotLettersInternalServerError",
    "NotLettersNotFoundError",
    "NotLettersPaymentRequiredError",
    "NotLettersUnauthorizedError",
    "UserData",
    "create_notletters_error",
    "parse_mail",
]
