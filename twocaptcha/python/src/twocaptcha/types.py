from dataclasses import dataclass


@dataclass
class GeeTestResult:
    """Result of GeeTest captcha resolution.

    Attributes:
        challenge: GeeTest challenge string.
        validate: GeeTest validate string.
        seccode: GeeTest seccode string.
    """

    challenge: str
    validate: str
    seccode: str
