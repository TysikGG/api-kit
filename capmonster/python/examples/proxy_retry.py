"""Spends balance. Customer proxy plus retries.

    CAPMONSTER_API_KEY=... uv run python examples/proxy_retry.py
"""

import os

from capmonster import CapMonster, recaptcha_v2, with_proxy


def main() -> None:
    client_key = os.environ.get("CAPMONSTER_API_KEY")
    if not client_key:
        raise SystemExit("Set CAPMONSTER_API_KEY")

    with CapMonster(client_key, timeout=60, retries=2, retry_delay=1) as client:
        task = with_proxy(
            recaptcha_v2(
                "https://example.com/login",
                "site-key",
                userAgent=client.get_user_agent(),
            ),
            proxyType="http",
            proxyAddress="1.2.3.4",
            proxyPort=8080,
            proxyLogin="user",
            proxyPassword="secret",
        )
        print(client.solve(task, timeout=120, interval=3)["gRecaptchaResponse"])


if __name__ == "__main__":
    main()
