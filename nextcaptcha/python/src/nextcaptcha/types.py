"""Type definitions for the NextCaptcha API client."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

ProxyType = Literal["http", "socks4", "socks5"]
TaskStatus = Literal["processing", "pending", "ready", "failed"]

# Documented `type` strings. JSON examples on the task pages are the source
# for the value that is sent. High-score and mobile proxy types keep the
# casing from those examples.
TASK_TYPES: dict[str, str] = {
    "recaptcha_v2": "RecaptchaV2TaskProxyless",
    "recaptcha_v2_enterprise": "RecaptchaV2EnterpriseTask",
    "recaptcha_v2_enterprise_proxyless": "RecaptchaV2EnterpriseTaskProxyless",
    "recaptcha_v2_hs_enterprise": "ReCaptchaV2HSEnterpriseTaskProxyLess",
    "recaptcha_v3": "RecaptchaV3Task",
    "recaptcha_v3_proxyless": "RecaptchaV3TaskProxyless",
    "recaptcha_v3_hs": "ReCaptchaV3HSTaskProxyLess",
    "recaptcha_mobile": "ReCaptchaMobileTask",
    "recaptcha_mobile_proxyless": "RecaptchaMobileTaskProxyless",
    "turnstile": "TurnstileTask",
    "turnstile_proxyless": "TurnstileTaskProxyless",
    "hcaptcha": "HCaptchaTask",
    "hcaptcha_proxyless": "HCaptchaTaskProxyless",
    "hcaptcha_enterprise": "HCaptchaEnterpriseTask",
    "funcaptcha": "FunCaptchaTask",
    "funcaptcha_proxyless": "FunCaptchaTaskProxyless",
}


class NextCaptchaBalance(TypedDict):
    """Account balance details."""

    balance: float


class TaskResult(TypedDict, total=False):
    """Result returned by getTaskResult."""

    status: str
    solution: dict[str, Any]


class RawApiResponse(TypedDict, total=False):
    """Envelope returned by NextCaptcha JSON endpoints."""

    errorId: int
    errorCode: str | None
    errorDescription: str | None
    taskId: int | str
    status: str
    solution: Any
    balance: float | str
