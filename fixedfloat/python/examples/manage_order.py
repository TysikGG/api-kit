"""Read an existing order, optionally subscribe an email, print QR codes, and poll.

Does not choose an emergency action unless FIXEDFLOAT_EMERGENCY is EXCHANGE or REFUND.

FIXEDFLOAT_ORDER_ID=... FIXEDFLOAT_ORDER_TOKEN=... \\
  FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... uv run python examples/manage_order.py
"""

import os

from fixedfloat import FixedFloat


def main() -> None:
    order_id = os.getenv("FIXEDFLOAT_ORDER_ID")
    token = os.getenv("FIXEDFLOAT_ORDER_TOKEN")
    if not order_id or not token:
        print("Set FIXEDFLOAT_ORDER_ID and FIXEDFLOAT_ORDER_TOKEN to inspect an order.")
        return

    with FixedFloat(
        api_key=os.getenv("FIXEDFLOAT_API_KEY"),
        api_secret=os.getenv("FIXEDFLOAT_API_SECRET"),
    ) as client:
        order = client.get_order(order_id, token)
        print(f"{order.id} {order.status} ({order.status_text})")
        print(f"Emergency: {order.emergency}")

        email = os.getenv("FIXEDFLOAT_EMAIL")
        if email:
            print("Email subscribed:", client.set_email(order_id, token, email))

        qr = client.get_qr(order_id, token)
        for code in qr.codes:
            print(f"QR {code.title} checked={code.checked} bytes={len(code.src)}")

        choice = os.getenv("FIXEDFLOAT_EMERGENCY")
        if choice in ("EXCHANGE", "REFUND"):
            ok = client.set_emergency(
                order_id,
                token,
                choice,  # type: ignore[arg-type]
                address=os.getenv("FIXEDFLOAT_REFUND_ADDRESS"),
                tag=os.getenv("FIXEDFLOAT_TAG"),
            )
            print("Emergency choice accepted:", ok)

        if os.getenv("FIXEDFLOAT_WAIT") == "1":
            finished = client.wait_for_order(order_id, token, timeout=60, interval=5)
            print("Wait result:", finished.status)


if __name__ == "__main__":
    main()
