"""Safe check: reads the account balance and does not spend credits.

PEAK_API_KEY=pk_... uv run python examples/check.py
"""

import os

from peak import Peak, format_balance


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    if not api_key:
        raise SystemExit("Set PEAK_API_KEY to your Peak API key.")

    with Peak(api_key) as client:
        balance = client.get_balance()
        print(format_balance(balance))
        print(balance)


if __name__ == "__main__":
    main()
