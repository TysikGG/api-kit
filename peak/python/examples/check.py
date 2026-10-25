"""Safe verification script: checks account balance without spending credits."""

import os

from peak import Peak


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    if not api_key:
        raise SystemExit("Please set PEAK_API_KEY environment variable")

    with Peak(api_key) as client:
        balance = client.get_balance()
        print(f"Account balance: {balance}")


if __name__ == "__main__":
    main()
