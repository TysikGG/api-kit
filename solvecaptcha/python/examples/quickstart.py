"""Quickstart example for the SolveCaptcha Python client."""

import os
import sys

from solvecaptcha import SolveCaptchaClient


def main() -> None:
    api_key = os.environ.get("SOLVECAPTCHA_API_KEY")
    if not api_key:
        print("Please set the SOLVECAPTCHA_API_KEY environment variable", file=sys.stderr)
        sys.exit(1)

    with SolveCaptchaClient(api_key=api_key) as client:
        balance = client.get_balance()
        print(f"SolveCaptcha Balance: ${balance:.4f}")


if __name__ == "__main__":
    main()
