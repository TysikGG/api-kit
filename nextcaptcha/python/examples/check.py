"""Safe verification script: checks account balance without submitting tasks."""

import os

from nextcaptcha import NextCaptcha


def main() -> None:
    client_key = os.environ.get("NEXTCAPTCHA_API_KEY")
    if not client_key:
        raise SystemExit("Please set NEXTCAPTCHA_API_KEY environment variable")

    with NextCaptcha(client_key) as client:
        balance = client.get_balance()
        print(f"Account balance: {balance}")


if __name__ == "__main__":
    main()
