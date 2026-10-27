"""Safe verification script: checks account balance without submitting tasks."""

import os

from capmonster import CapMonster


def main() -> None:
    client_key = os.environ.get("CAPMONSTER_API_KEY")
    if not client_key:
        raise SystemExit("Please set CAPMONSTER_API_KEY environment variable")

    with CapMonster(client_key) as client:
        balance = client.get_balance()
        print(f"Account balance: {balance}")


if __name__ == "__main__":
    main()
