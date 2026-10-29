"""Anti-Captcha compatible JSON task.

CAPGURU_API_KEY=... CAPGURU_SITEKEY=... uv run python examples/json_task.py
"""

import os
import sys

from capguru import CapGuruClient, read_solution_token


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    website_key = os.getenv("CAPGURU_SITEKEY")
    if not api_key or not website_key:
        print("Set CAPGURU_API_KEY and CAPGURU_SITEKEY", file=sys.stderr)
        raise SystemExit(1)
    with CapGuruClient(api_key) as client:
        result = client.solve_json_task(
            {
                "type": "NoCaptchaTaskProxyless",
                "websiteURL": os.getenv("CAPGURU_PAGE_URL", "https://example.com"),
                "websiteKey": website_key,
            },
            language_pool="en",
        )
    print(read_solution_token(result.solution))


if __name__ == "__main__":
    main()
