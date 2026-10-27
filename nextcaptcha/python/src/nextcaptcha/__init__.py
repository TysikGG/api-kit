"""NextCaptcha recognition API client."""

from .client import DEFAULT_SOFT_ID, NextCaptcha
from .errors import NEXTCAPTCHA_ERRORS, NextCaptchaError
from .tasks import (
    funcaptcha,
    hcaptcha,
    hcaptcha_enterprise,
    recaptcha_mobile,
    recaptcha_mobile_proxyless,
    recaptcha_v2,
    recaptcha_v2_enterprise,
    recaptcha_v2_enterprise_proxyless,
    recaptcha_v2_hs_enterprise,
    recaptcha_v3,
    recaptcha_v3_hs,
    recaptcha_v3_proxyless,
    turnstile,
    turnstile_proxyless,
)
from .types import (
    TASK_TYPES,
    NextCaptchaBalance,
    RawApiResponse,
    TaskResult,
    TaskStatus,
)

__all__ = [
    "DEFAULT_SOFT_ID",
    "NEXTCAPTCHA_ERRORS",
    "TASK_TYPES",
    "NextCaptcha",
    "NextCaptchaBalance",
    "NextCaptchaError",
    "RawApiResponse",
    "TaskResult",
    "TaskStatus",
    "funcaptcha",
    "hcaptcha",
    "hcaptcha_enterprise",
    "recaptcha_mobile",
    "recaptcha_mobile_proxyless",
    "recaptcha_v2",
    "recaptcha_v2_enterprise",
    "recaptcha_v2_enterprise_proxyless",
    "recaptcha_v2_hs_enterprise",
    "recaptcha_v3",
    "recaptcha_v3_hs",
    "recaptcha_v3_proxyless",
    "turnstile",
    "turnstile_proxyless",
]
