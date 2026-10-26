"""Data types and models for the SolveCaptcha API."""

from dataclasses import dataclass


@dataclass
class GeeTestResult:
    """Result for GeeTest captcha solutions."""

    challenge: str
    validate: str
    seccode: str


@dataclass
class CaptchaTask:
    """Represents an ongoing captcha solving task."""

    task_id: str
    solution: str | None = None
