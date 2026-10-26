"""SolveCaptcha Python Client."""

from .client import DEFAULT_SOFT_ID, SolveCaptchaClient
from .errors import SolveCaptchaError
from .types import CaptchaTask, GeeTestResult

__all__ = [
    "DEFAULT_SOFT_ID",
    "CaptchaTask",
    "GeeTestResult",
    "SolveCaptchaClient",
    "SolveCaptchaError",
]
