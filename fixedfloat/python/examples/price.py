"""Quotes: keyword arguments, shorthand strings, and quote errors.

FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... uv run python examples/price.py
"""

import os

from fixedfloat import FixedFloat, FixedFloatError


def main() -> None:
    with FixedFloat(
        api_key=os.getenv("FIXEDFLOAT_API_KEY"),
        api_secret=os.getenv("FIXEDFLOAT_API_SECRET"),
    ) as client:
        fixed = client.get_price(
            "ETH",
            "BTC",
            0.1,
            direction="from",
            order_type="fixed",
            ccies=True,
            usd=True,
        )
        print("Fixed from", fixed.from_side.amount, "to", fixed.to_side.amount)
        print("Currencies in quote", 0 if fixed.ccies is None else len(fixed.ccies))

        receive = client.get_price_shorthand("ETH", "0.001 BTC", "float")
        print("Receive 0.001 BTC, send", receive.from_side.amount, receive.from_side.code)

        try:
            client.get_price_or_raise("BTC", "ETH", 0.00000001)
            print("Tiny quote accepted")
        except FixedFloatError as exc:
            print("Quote blocked:", exc)


if __name__ == "__main__":
    main()
