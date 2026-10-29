"""Proxy, retries, and cancellation on a reCAPTCHA v2 task.

CAPGURU_API_KEY=... CAPGURU_SITEKEY=... uv run python examples/advanced.py
"""

import os
import sys
import time

from capguru import CapGuruClient


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    googlekey = os.getenv("CAPGURU_SITEKEY")
    if not api_key or not googlekey:
        print("Set CAPGURU_API_KEY and CAPGURU_SITEKEY", file=sys.stderr)
        raise SystemExit(1)
    started = time.monotonic()
    with CapGuruClient(
        api_key,
        base_url=os.getenv("CAPGURU_BASE_URL", "https://api.cap.guru"),
        max_retries=2,
        retry_delay=1.0,
    ) as client:
        token = client.solve_recaptcha_v2(
            googlekey,
            os.getenv("CAPGURU_PAGE_URL", "https://example.com"),
            proxy=os.getenv("CAPGURU_PROXY"),
            proxy_type=os.getenv("CAPGURU_PROXY_TYPE"),
            timeout=120,
            interval=5,
            on_not_ready=lambda info: print("waiting", info["task_id"], info["attempt"]),
            should_stop=lambda: time.monotonic() - started > 90,
        )
    print(token)


if __name__ == "__main__":
    main()
