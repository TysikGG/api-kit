"""Task builders for the NextCaptcha API.

Each helper sets `type` and forwards the remaining API fields unchanged.
Field names match the JSON documented at https://nextcaptcha.com/apidocs.

hCaptcha and FunCaptcha are not in the current apidocs sidebar. The official
NextCaptcha clients still submit those type strings, and the product lists
both captchas, so the helpers follow that client contract.

The published task catalog does not document an image-to-text task type.
`ERROR_IMAGE_TYPE_NOT_SUPPORTED` is mapped for responses that reject an image.
"""

from __future__ import annotations

from typing import Any

from .types import TASK_TYPES


def _task(task_type: str, fields: dict[str, Any]) -> dict[str, Any]:
    task: dict[str, Any] = {"type": task_type}
    for key, value in fields.items():
        if value is not None:
            task[key] = value
    return task


def recaptcha_v2(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v2 proxyless (`RecaptchaV2TaskProxyless`)."""
    return _task(
        TASK_TYPES["recaptcha_v2"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v2_enterprise(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v2 Enterprise with a customer proxy (`RecaptchaV2EnterpriseTask`)."""
    return _task(
        TASK_TYPES["recaptcha_v2_enterprise"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v2_enterprise_proxyless(
    website_url: str, website_key: str, **extra: Any
) -> dict[str, Any]:
    """reCAPTCHA v2 Enterprise proxyless (`RecaptchaV2EnterpriseTaskProxyless`)."""
    return _task(
        TASK_TYPES["recaptcha_v2_enterprise_proxyless"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v2_hs_enterprise(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """High-score reCAPTCHA v2 Enterprise proxyless (`ReCaptchaV2HSEnterpriseTaskProxyLess`)."""
    return _task(
        TASK_TYPES["recaptcha_v2_hs_enterprise"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v3(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v3 with a customer proxy (`RecaptchaV3Task`)."""
    return _task(
        TASK_TYPES["recaptcha_v3"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v3_proxyless(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """reCAPTCHA v3 proxyless (`RecaptchaV3TaskProxyless`)."""
    return _task(
        TASK_TYPES["recaptcha_v3_proxyless"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_v3_hs(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """High-score reCAPTCHA v3 proxyless (`ReCaptchaV3HSTaskProxyLess`)."""
    return _task(
        TASK_TYPES["recaptcha_v3_hs"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def recaptcha_mobile(
    app_package_name: str,
    app_key: str,
    app_action: str,
    **extra: Any,
) -> dict[str, Any]:
    """Mobile reCAPTCHA with a customer proxy (`ReCaptchaMobileTask`)."""
    return _task(
        TASK_TYPES["recaptcha_mobile"],
        {
            "appPackageName": app_package_name,
            "appKey": app_key,
            "appAction": app_action,
            **extra,
        },
    )


def recaptcha_mobile_proxyless(
    app_package_name: str,
    app_key: str,
    app_action: str,
    **extra: Any,
) -> dict[str, Any]:
    """Mobile reCAPTCHA proxyless (`RecaptchaMobileTaskProxyless`)."""
    return _task(
        TASK_TYPES["recaptcha_mobile_proxyless"],
        {
            "appPackageName": app_package_name,
            "appKey": app_key,
            "appAction": app_action,
            **extra,
        },
    )


def turnstile(website_url: str, **extra: Any) -> dict[str, Any]:
    """Cloudflare cf_clearance (`TurnstileTask`). Proxy fields go in extra."""
    return _task(TASK_TYPES["turnstile"], {"websiteURL": website_url, **extra})


def turnstile_proxyless(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """Cloudflare Turnstile token (`TurnstileTaskProxyless`)."""
    return _task(
        TASK_TYPES["turnstile_proxyless"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def hcaptcha(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """hCaptcha. A `proxyAddress` selects `HCaptchaTask`; otherwise the task is proxyless."""
    task_type = (
        TASK_TYPES["hcaptcha"] if extra.get("proxyAddress") else TASK_TYPES["hcaptcha_proxyless"]
    )
    return _task(task_type, {"websiteURL": website_url, "websiteKey": website_key, **extra})


def hcaptcha_enterprise(website_url: str, website_key: str, **extra: Any) -> dict[str, Any]:
    """hCaptcha Enterprise (`HCaptchaEnterpriseTask`)."""
    return _task(
        TASK_TYPES["hcaptcha_enterprise"],
        {"websiteURL": website_url, "websiteKey": website_key, **extra},
    )


def funcaptcha(website_public_key: str, **extra: Any) -> dict[str, Any]:
    """FunCaptcha. A `proxyAddress` selects `FunCaptchaTask`; otherwise the task is proxyless."""
    task_type = (
        TASK_TYPES["funcaptcha"]
        if extra.get("proxyAddress")
        else TASK_TYPES["funcaptcha_proxyless"]
    )
    return _task(task_type, {"websitePublicKey": website_public_key, **extra})
