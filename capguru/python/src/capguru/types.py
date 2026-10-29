"""Result types returned by the Cap.guru client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class GeeTestResult:
    """GeeTest v3 token fields."""

    challenge: str
    validate: str
    seccode: str


@dataclass
class Point:
    """A click or slider coordinate."""

    x: float
    y: float
    w: float | None = None


@dataclass
class ClickSolution:
    """Parsed image-click or slider answer."""

    raw: str
    points: list[Point] | None = None
    cells: list[int] | None = None


@dataclass
class JsonTaskResult:
    """A ready Anti-Captcha compatible task."""

    task_id: str
    status: str
    solution: Any
    raw: Any
