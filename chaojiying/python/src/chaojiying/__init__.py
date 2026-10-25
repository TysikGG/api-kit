"""Chaojiying (超级鹰) CAPTCHA recognition API client."""

from .client import SOFT_ID, SOFT_KEY, Chaojiying
from .errors import ChaojiyingError
from .types import RecognizeResult, ReportErrorResult, ScoreResult

__all__ = [
    "SOFT_ID",
    "SOFT_KEY",
    "Chaojiying",
    "ChaojiyingError",
    "RecognizeResult",
    "ReportErrorResult",
    "ScoreResult",
]
