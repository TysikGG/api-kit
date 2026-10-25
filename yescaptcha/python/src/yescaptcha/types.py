"""Type definitions for the YesCaptcha API client."""

from __future__ import annotations

from typing import Any, Literal, TypedDict


class YesCaptchaBalance(TypedDict, total=False):
    """Account balance details."""

    balance: float
    softBalance: float
    inviteBalance: float
    inviteBy: int


TaskStatus = Literal["processing", "ready"]


class TaskResult(TypedDict, total=False):
    """Result returned by getTaskResult."""

    status: TaskStatus
    solution: dict[str, Any]


class RawApiResponse(TypedDict, total=False):
    """Envelope returned by YesCaptcha endpoints."""

    errorId: int
    errorCode: str
    errorDescription: str
    taskId: str
    status: TaskStatus
    solution: Any
    balance: float
    softBalance: float
    inviteBalance: float
    inviteBy: int
