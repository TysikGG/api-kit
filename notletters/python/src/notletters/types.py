from enum import IntEnum
from typing import TypedDict


class EmailType(IntEnum):
    """Types of emails available for purchase on NotLetters."""

    LIMIT = 0
    UNLIMITED = 1
    RU_ZONE = 2
    PERSONAL = 3


class LetterFilters(TypedDict, total=False):
    """Filter criteria for searching emails."""

    search: str
    star: bool


class LetterBody(TypedDict):
    """Body contents of an email message."""

    html: str
    text: str


class Letter(TypedDict):
    """A retrieved email message."""

    id: str
    sender: str
    sender_name: str
    subject: str
    letter: LetterBody
    star: bool
    date: int


class UserData(TypedDict):
    """User profile information and balance."""

    id: str
    username: str
    balance: float
    rate_limit: int


class ChangePasswordResult(TypedDict):
    """Response returned when changing a mailbox password."""

    code: int
    data: str


class Mail(dict):
    """Purchased email account credentials."""

    def __init__(self, raw: str) -> None:
        raw_clean = raw.strip()
        if ":" in raw_clean:
            email, password = raw_clean.split(":", 1)
        else:
            email, password = raw_clean, ""
        super().__init__(email=email, password=password, raw=raw_clean)

    @property
    def email(self) -> str:
        """The email address."""
        return self["email"]

    @property
    def password(self) -> str:
        """The mailbox password."""
        return self["password"]

    @property
    def raw(self) -> str:
        """The raw email:password string."""
        return self["raw"]

    def __str__(self) -> str:
        return self["raw"]


def parse_mail(raw: str) -> Mail:
    """Parses an email:password string into a Mail object.

    Args:
        raw: Raw credentials string (e.g. "user@notletters.com:pass123").

    Returns:
        A Mail object with email and password attributes and dict access.
    """
    return Mail(raw)
