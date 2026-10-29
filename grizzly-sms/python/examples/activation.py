"""Order a Telegram number, wait for a code, and complete it.

This spends balance. Set GRIZZLY_API_KEY. Optional: GRIZZLY_COUNTRY, GRIZZLY_MAX_PRICE.
"""

import os

from grizzly_sms import GrizzlySms, GrizzlySmsError


def main() -> None:
    country = os.environ.get("GRIZZLY_COUNTRY", "any")
    max_price = float(os.environ.get("GRIZZLY_MAX_PRICE", "1"))
    with GrizzlySms(os.environ["GRIZZLY_API_KEY"], retries=2) as sms:
        try:
            order, received = sms.activate(
                "tg",
                country=country,
                max_price=max_price,
                timeout_ms=120_000,
                cancel_on_timeout=True,
                on_status=lambda status: print(status.status),
            )
        except GrizzlySmsError as exc:
            print(exc.code, exc.raw)
            raise SystemExit(1) from exc
        print(order.phone_number, received.code, order.activation_cost)
        detailed = sms.get_status_v2(order.activation_id)
        sms_row = detailed.get("sms") or {}
        call_row = detailed.get("call") or {}
        print(sms_row.get("text") or call_row.get("text") or "")
        print(sms.complete(order.activation_id))


if __name__ == "__main__":
    main()
