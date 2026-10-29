"""Shared defaults for the Peak client."""

APP_ID = "app_05c1f418153804ec393a7211"
DEFAULT_BASE_URL = "https://api.peak.fo"
DEFAULT_TIMEOUT = 60.0
DEFAULT_RETRY_DELAY = 1.0

TASK_TURNSTILE = "turnstiletask"
TASK_TURNSTILE_PROXYLESS = "TurnstileTaskProxyLess"
TASK_CLOUDFLARE_5S = "cloudflare5stask"
TASK_AWS_WAF = "awswaftask"

WINDOWS_CHROME_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
