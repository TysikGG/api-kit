"""Token solvers. Each command spends credit.

    CAPGURU_API_KEY=... uv run python examples/tokens.py recaptcha-v2

Commands: recaptcha-v2, recaptcha-v3, turnstile, hcaptcha, funcaptcha, geetest
"""

import os
import sys

from capguru import CapGuruClient


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if not api_key:
        print("Set CAPGURU_API_KEY", file=sys.stderr)
        raise SystemExit(1)
    pageurl = os.getenv("CAPGURU_PAGE_URL", "https://example.com")
    sitekey = os.getenv("CAPGURU_SITEKEY", "")
    with CapGuruClient(api_key) as client:
        if command == "recaptcha-v2":
            print(client.solve_recaptcha_v2(sitekey, pageurl, invisible=False))
        elif command == "recaptcha-v3":
            print(
                client.solve_recaptcha_v3(
                    sitekey,
                    pageurl,
                    action=os.getenv("CAPGURU_ACTION"),
                    min_score=0.3,
                )
            )
        elif command == "turnstile":
            print(client.solve_turnstile(sitekey, pageurl, action=os.getenv("CAPGURU_ACTION")))
        elif command == "hcaptcha":
            print(client.solve_hcaptcha(sitekey, pageurl))
        elif command == "funcaptcha":
            print(client.solve_funcaptcha(sitekey, pageurl, surl=os.getenv("CAPGURU_SURL")))
        elif command == "geetest":
            print(
                client.solve_geetest(
                    os.getenv("CAPGURU_GT", ""),
                    os.getenv("CAPGURU_CHALLENGE", ""),
                    pageurl,
                )
            )
        else:
            print("Usage: tokens.py <command>", file=sys.stderr)
            raise SystemExit(1)


if __name__ == "__main__":
    main()
