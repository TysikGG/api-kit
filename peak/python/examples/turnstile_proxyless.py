"""Proxyless Turnstile. Peak solves through its own pool.

A successful call spends a credit.

PEAK_API_KEY=pk_... uv run python examples/turnstile_proxyless.py
"""

import os

from peak import Peak


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    if not api_key:
        raise SystemExit("Set PEAK_API_KEY to your Peak API key.")

    with Peak(api_key, timeout=60) as client:
        result = client.solve_turnstile(
            "https://example.com/",
            "0x4AAAAAAADnPIDROrmt1Wwj",
        )
        print("cf-turnstile-response:", result["token"])


if __name__ == "__main__":
    main()
