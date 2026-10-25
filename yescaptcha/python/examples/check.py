"""Safe verification script: checks account balance without submitting tasks."""

import os

from yescaptcha import YesCaptcha


def main() -> None:
    client_key = os.environ.get("YESCAPTCHA_CLIENT_KEY")
    if not client_key:
        raise SystemExit("Please set YESCAPTCHA_CLIENT_KEY environment variable")

    with YesCaptcha(client_key) as client:
        balance = client.get_balance()
        print(f"Account balance: {balance}")


if __name__ == "__main__":
    main()
