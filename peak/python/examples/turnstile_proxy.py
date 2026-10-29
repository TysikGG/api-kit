"""Proxied Turnstile, including action and cdata.

A successful call spends a credit.

PEAK_API_KEY=pk_... PEAK_PROXY=http://user:pass@1.2.3.4:8080 \\
  uv run python examples/turnstile_proxy.py
"""

import os

from peak import Peak, format_proxy


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    proxy = os.environ.get("PEAK_PROXY")
    if not api_key or not proxy:
        raise SystemExit("Set PEAK_API_KEY and PEAK_PROXY (http://user:pass@host:port).")

    with Peak(api_key) as client:
        result = client.solve_turnstile(
            "https://example.com/",
            "0x4AAAAAAADnPIDROrmt1Wwj",
            proxy=format_proxy(proxy),
            action="login",
            cdata="session-42",
        )
        print("cf-turnstile-response:", result["token"])


if __name__ == "__main__":
    main()
