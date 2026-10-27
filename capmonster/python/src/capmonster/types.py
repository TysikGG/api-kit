"""Type definitions for the CapMonster Cloud API client."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

ProxyType = Literal["http", "https", "socks4", "socks5"]
TaskStatus = Literal["processing", "ready"]

# Documented `type` values. Custom captchas also set `class` (see TASK_CLASSES).
TASK_TYPES: dict[str, str] = {
    "recaptcha_v2": "RecaptchaV2Task",
    "recaptcha_v2_proxyless": "RecaptchaV2TaskProxyless",
    "no_captcha": "NoCaptchaTask",
    "no_captcha_proxyless": "NoCaptchaTaskProxyless",
    "recaptcha_v2_enterprise": "RecaptchaV2EnterpriseTask",
    "recaptcha_v3": "RecaptchaV3TaskProxyless",
    "recaptcha_v3_enterprise": "RecaptchaV3EnterpriseTask",
    "turnstile": "TurnstileTask",
    "geetest": "GeeTestTask",
    "image_to_text": "ImageToTextTask",
    "complex_image": "ComplexImageTask",
    "custom": "CustomTask",
    "funcaptcha": "FunCaptchaTask",
    "hcaptcha": "HCaptchaTask",
    "hcaptcha_proxyless": "HCaptchaTaskProxyless",
    "amazon": "AmazonTask",
    "binance": "BinanceTask",
    "prosopo": "ProsopoTask",
    "yidun": "YidunTask",
    "mtcaptcha": "MTCaptchaTask",
}

# `class` values for CustomTask and ComplexImageTask.
TASK_CLASSES: dict[str, str] = {
    "datadome": "DataDome",
    "tendi": "TenDI",
    "basilisk": "Basilisk",
    "imperva": "Imperva",
    "altcha": "altcha",
    "friendly": "friendly",
    "temu": "Temu",
    "castle": "Castle",
    "tspd": "tspd",
    "hunt": "HUNT",
    "alibaba": "alibaba",
    "complex_recaptcha": "recaptcha",
    "complex_hcaptcha": "hcaptcha",
    "complex_funcaptcha": "funcaptcha",
    "complex_recognition": "recognition",
}


class CapMonsterBalance(TypedDict):
    """Account balance details."""

    balance: float


class TaskResult(TypedDict, total=False):
    """Result returned by getTaskResult."""

    status: TaskStatus
    solution: dict[str, Any]


class RawApiResponse(TypedDict, total=False):
    """Envelope returned by CapMonster Cloud endpoints."""

    errorId: int
    errorCode: str | None
    errorDescription: str | None
    taskId: int | str
    status: TaskStatus
    solution: Any
    balance: float
