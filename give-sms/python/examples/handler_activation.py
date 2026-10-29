"""SMS-Activate compatible handler flow.

    GIVE_SMS_API_KEY=... uv run python examples/handler_activation.py
"""

import os

from give_sms import GiveSms


def main() -> None:
    api_key = os.getenv("GIVE_SMS_API_KEY")
    if not api_key:
        print("Set GIVE_SMS_API_KEY to call the handler API.")
        return
    with GiveSms(api_key) as client:
        print("Balance", client.handler_get_balance())
        print("Prices", client.handler_get_prices(country=2, service="tg", tiers=1))
        counts = client.handler_get_numbers_status(country=2)
        print("tg_0 count", counts.get("tg_0"))
        if os.getenv("GIVE_SMS_ALLOW_PAID") != "1":
            print("Set GIVE_SMS_ALLOW_PAID=1 to order.")
            return
        ordered = client.handler_get_number("tg", country=2)
        print(ordered.id, ordered.number)
        print(client.handler_ready(ordered.id))
        try:
            status = client.handler_wait_for_code(ordered.id, timeout=60, interval=5)
            print(status.status, status.code)
            print(client.handler_complete(ordered.id))
        except Exception as exc:
            print(exc)
            print(client.handler_cancel(ordered.id))


if __name__ == "__main__":
    main()
