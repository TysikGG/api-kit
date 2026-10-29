"""Read-only balance check. Does not order a number.

    GIVE_SMS_API_KEY=... uv run python examples/check.py
"""

import os

from give_sms import GiveSms


def main() -> None:
    api_key = os.getenv("GIVE_SMS_API_KEY")
    if not api_key:
        print("Set GIVE_SMS_API_KEY to call Give-SMS. Nothing was ordered.")
        return
    with GiveSms(api_key) as client:
        print(f"Balance: {client.get_balance()}")
        counts = client.get_count(country="kazakhstan")
        print(f"Operators in the Kazakhstan catalog: {len(counts)}")
        print(f"Handler balance: {client.handler_get_balance()}")


if __name__ == "__main__":
    main()
