"""Create a float order.

This spends nothing until you deposit, but it does open an order.
Set FIXEDFLOAT_CREATE=1 to run it.

FIXEDFLOAT_CREATE=1 FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... \\
  FIXEDFLOAT_TO_ADDRESS=0x... uv run python examples/create_order.py
"""

import os
import sys

from fixedfloat import FixedFloat


def main() -> None:
    if os.getenv("FIXEDFLOAT_CREATE") != "1":
        print("Refusing to create an order. Set FIXEDFLOAT_CREATE=1 to continue.")
        return
    to_address = os.getenv("FIXEDFLOAT_TO_ADDRESS")
    if not to_address:
        print("Set FIXEDFLOAT_TO_ADDRESS to the wallet that should receive funds.", file=sys.stderr)
        sys.exit(1)

    with FixedFloat(
        api_key=os.getenv("FIXEDFLOAT_API_KEY"),
        api_secret=os.getenv("FIXEDFLOAT_API_SECRET"),
    ) as client:
        order = client.create_order(
            "BTC",
            "ETH",
            0.01,
            to_address,
            direction="from",
            order_type="float",
            tag=os.getenv("FIXEDFLOAT_TAG"),
            refund_address=os.getenv("FIXEDFLOAT_REFUND_ADDRESS"),
        )
        print(f"Order {order.id} status {order.status}")
        print(f"Token: {order.token}")
        print(
            f"Deposit {order.from_side.amount} {order.from_side.code} to {order.from_side.address}"
        )
        print(f"Expect about {order.to_side.amount} {order.to_side.code}")


if __name__ == "__main__":
    main()
