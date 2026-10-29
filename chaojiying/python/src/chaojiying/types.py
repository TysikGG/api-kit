"""Dictionary results that also support attribute access."""

from __future__ import annotations

from typing import Any


class AttrDict(dict[str, Any]):
    """Mapping returned by the client. ``result["pic_str"]`` and ``result.pic_str`` both work."""

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError as exc:
            raise AttributeError(name) from exc


class ScoreResult(AttrDict):
    """Result of an account score query."""


class RecognizeResult(AttrDict):
    """Result of CAPTCHA recognition."""


class ReportErrorResult(AttrDict):
    """Result of a mistake report."""
