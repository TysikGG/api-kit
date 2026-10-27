"""Task builders for documented CapMonster Cloud captcha types.

Each helper sets `type` (and `class`, when the docs require `CustomTask`)
and forwards the remaining API fields unchanged. Field names match the JSON
documented at https://docs.capmonster.cloud/docs/captchas/.
"""

from __future__ import annotations

from typing import Any


def _task(task_type: str, fields: dict[str, Any], task_class: str | None = None) -> dict[str, Any]:
    task: dict[str, Any] = {"type": task_type}
    if task_class is not None:
        task["class"] = task_class
    task.update(fields)
    return task


def recaptcha_v2(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v2 (`RecaptchaV2Task`)."""
    return _task(
        "RecaptchaV2Task",
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v2_enterprise(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v2 Enterprise (`RecaptchaV2EnterpriseTask`)."""
    return _task(
        "RecaptchaV2EnterpriseTask",
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v3(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v3 (`RecaptchaV3TaskProxyless`). Pass isEnterprise=True for v3 Enterprise."""
    return _task(
        "RecaptchaV3TaskProxyless",
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v3_enterprise(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v3 Enterprise (`RecaptchaV3EnterpriseTask`)."""
    return _task(
        "RecaptchaV3EnterpriseTask",
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def turnstile(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """Cloudflare Turnstile, Challenge, and Waiting Room (`TurnstileTask`)."""
    return _task("TurnstileTask", {"websiteURL": website_url, "websiteKey": website_key, **extra})


def geetest(website_url: str, gt: str, **extra: Any) -> dict[str, Any]:
    """GeeTest v3 or v4 (`GeeTestTask`). Pass version and challenge via extra."""
    return _task("GeeTestTask", {"websiteURL": website_url, "gt": gt, **extra})


def image_to_text(body: str, **extra: Any) -> dict[str, Any]:
    """ImageToTextTask. `body` is a single-line Base64 image."""
    return _task("ImageToTextTask", {"body": body, **extra})


def complex_image(class_name: str, **extra: Any) -> dict[str, Any]:
    """ComplexImageTask. `class_name` is recaptcha, hcaptcha, funcaptcha, or recognition."""
    return _task("ComplexImageTask", extra, class_name)


def datadome(website_url: str, metadata: dict[str, Any], **extra: Any) -> dict[str, Any]:
    """DataDome (`CustomTask` / `DataDome`). Requires your own proxy in extra."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "metadata": metadata, **extra},
        "DataDome",
    )


def tendi(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """TenDI / Tencent captcha (`CustomTask` / `TenDI`).

    CapMonster documents this captcha as TenDI, not Tenable.
    """
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
        "TenDI",
    )


def amazon(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """Amazon / AWS WAF (`AmazonTask`)."""
    return _task("AmazonTask", {"websiteURL": website_url, "websiteKey": website_key, **extra})


def binance(website_url: str, website_key: str, validate_id: str, **extra: Any) -> dict[str, Any]:
    """Binance captcha (`BinanceTask`)."""
    return _task(
        "BinanceTask",
        {
            "websiteURL": website_url,
            "websiteKey": website_key,
            "validateId": validate_id,
            **extra,
        },
    )


def funcaptcha(website_url: str, website_public_key: str, **extra: Any) -> dict[str, Any]:
    """Arkose Labs FunCaptcha (`FunCaptchaTask`)."""
    return _task(
        "FunCaptchaTask",
        {"websiteURL": website_url, "websitePublicKey": website_public_key, **extra},
    )


def hcaptcha(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """hCaptcha (`HCaptchaTask`)."""
    return _task("HCaptchaTask", {"websiteURL": website_url, "websiteKey": website_key, **extra})


def basilisk(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """Basilisk (`CustomTask` / `Basilisk`)."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
        "Basilisk",
    )


def imperva(website_url: str, metadata: dict[str, Any], **extra: Any) -> dict[str, Any]:
    """Imperva / Incapsula (`CustomTask` / `Imperva`)."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "metadata": metadata, **extra},
        "Imperva",
    )


def prosopo(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """Prosopo (`ProsopoTask`)."""
    return _task("ProsopoTask", {"websiteURL": website_url, "websiteKey": website_key, **extra})


def yidun(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """Yidun (`YidunTask`)."""
    return _task("YidunTask", {"websiteURL": website_url, "websiteKey": website_key, **extra})


def mtcaptcha(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """MTCaptcha (`MTCaptchaTask`)."""
    return _task("MTCaptchaTask", {"websiteURL": website_url, "websiteKey": website_key, **extra})


def altcha(
    website_url: str,
    website_key: str,
    metadata: dict[str, Any],
    **extra: Any,
) -> dict[str, Any]:
    """Altcha (`CustomTask` / `altcha`)."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "websiteKey": website_key, "metadata": metadata, **extra},
        "altcha",
    )


def friendly_captcha(
    website_url: str,
    website_key: str,
    metadata: dict[str, Any],
    **extra: Any,
) -> dict[str, Any]:
    """Friendly Captcha (`CustomTask` / `friendly`)."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "websiteKey": website_key, "metadata": metadata, **extra},
        "friendly",
    )


def temu(website_url: str, metadata: dict[str, Any], **extra: Any) -> dict[str, Any]:
    """Temu (`CustomTask` / `Temu`)."""
    return _task("CustomTask", {"websiteURL": website_url, "metadata": metadata, **extra}, "Temu")


def castle(
    website_url: str,
    website_key: str,
    metadata: dict[str, Any],
    **extra: Any,
) -> dict[str, Any]:
    """Castle (`CustomTask` / `Castle`)."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "websiteKey": website_key, "metadata": metadata, **extra},
        "Castle",
    )


def tspd(
    website_url: str,
    user_agent: str,
    metadata: dict[str, Any],
    **extra: Any,
) -> dict[str, Any]:
    """TSPD (`CustomTask` / `tspd`)."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "userAgent": user_agent, "metadata": metadata, **extra},
        "tspd",
    )


def hunt(website_url: str, metadata: dict[str, Any], **extra: Any) -> dict[str, Any]:
    """Hunt CAPTCHA (`CustomTask` / `HUNT`)."""
    return _task("CustomTask", {"websiteURL": website_url, "metadata": metadata, **extra}, "HUNT")


def alibaba(website_url: str, metadata: dict[str, Any], **extra: Any) -> dict[str, Any]:
    """Alibaba captcha (`CustomTask` / `alibaba`)."""
    return _task(
        "CustomTask",
        {"websiteURL": website_url, "metadata": metadata, **extra},
        "alibaba",
    )
