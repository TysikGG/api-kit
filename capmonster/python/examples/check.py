"""Safe verification script: checks account balance without submitting tasks."""

import os

from capmonster import CapMonster


def main() -> None:
    client_key = os.environ.get("CAPMONSTER_API_KEY")
    if not client_key:
        raise SystemExit("Please set CAPMONSTER_API_KEY environment variable")

    with CapMonster(client_key) as client:
        balance = client.get_balance()
        user_agent = client.get_user_agent()
        print(f"Account balance: {balance}")
        print(f"Current user agent: {user_agent}")


if __name__ == "__main__":
    main()
