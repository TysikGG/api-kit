"""Balance check with retries. Does not spend credits.

PEAK_API_KEY=pk_... uv run python examples/retries.py
"""

import os

from peak import Peak, RetryTimeoutError


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    if not api_key:
        raise SystemExit("Set PEAK_API_KEY to your Peak API key.")

    with Peak(api_key, retries=2, retry_delay=0.5, retry_timeout=10) as client:
        try:
            print(client.get_balance())
        except RetryTimeoutError:
            print("Gave up before the retry budget elapsed.")
            raise


if __name__ == "__main__":
    main()
