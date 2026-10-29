"""Cloudflare 5-second challenge through a sticky proxy.

A successful call spends a credit.

PEAK_API_KEY=pk_... PEAK_PROXY=http://user:pass@1.2.3.4:8080 \\
  uv run python examples/cloudflare_5s.py
"""

import os

from peak import WINDOWS_CHROME_USER_AGENT, Peak, build_clearance_request


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    proxy = os.environ.get("PEAK_PROXY")
    if not api_key or not proxy:
        raise SystemExit("Set PEAK_API_KEY and a sticky PEAK_PROXY.")

    target = "https://example.com/"
    with Peak(api_key, retries=2, retry_delay=1) as client:
        solution = client.solve_cloudflare_5s(
            target,
            proxy,
            user_agent=WINDOWS_CHROME_USER_AGENT,
        )
        request = build_clearance_request(target, solution)
        print("Cookie:", request["cookie_header"])
        print("Referer:", request["referer"])
        print("User-Agent:", request["user_agent"])
        print("Form body:", request["body"])


if __name__ == "__main__":
    main()
