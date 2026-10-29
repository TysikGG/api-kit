"""Native /api/v1/ activation. Ordering spends balance.

    GIVE_SMS_API_KEY=... GIVE_SMS_ALLOW_PAID=1 uv run python examples/native_activation.py
"""

import os

from give_sms import GiveSms, GiveSmsError


def main() -> None:
    api_key = os.getenv("GIVE_SMS_API_KEY")
    if not api_key:
        print("Set GIVE_SMS_API_KEY. Ordering requires GIVE_SMS_ALLOW_PAID=1.")
        return
    with GiveSms(api_key, retries=2, retry_delay=0.5) as client:
        print("Telegram availability sample:", client.get_all_count(service="tg"))
        if os.getenv("GIVE_SMS_ALLOW_PAID") != "1":
            print("Refusing to order. Set GIVE_SMS_ALLOW_PAID=1 to continue.")
            return
        activation = client.purchase("tg", country="kazakhstan")
        print(f"Number +{activation.number} order {activation.id}")
        try:
            sms = activation.wait_for_code(timeout=60, interval=5)
            print("Code:", sms.code, "SMS:", sms.full_sms)
            nxt = activation.wrong_code(sms.sms_id)
            print("Next status:", nxt.status, nxt.code or "")
        except GiveSmsError as exc:
            print(exc.code, exc.message, exc.reason or "")
            activation.cancel()


if __name__ == "__main__":
    main()
