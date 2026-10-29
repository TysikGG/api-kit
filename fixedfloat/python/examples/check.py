"""Read-only check: currencies, one quote, and the public XML rate for BTC to ETH.

FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... uv run python examples/check.py
"""

import os
import sys

from fixedfloat import FixedFloat


def main() -> None:
    api_key = os.getenv("FIXEDFLOAT_API_KEY")
    api_secret = os.getenv("FIXEDFLOAT_API_SECRET")
    if not api_key or not api_secret:
        print("Set FIXEDFLOAT_API_KEY and FIXEDFLOAT_API_SECRET.", file=sys.stderr)
        sys.exit(1)

    with FixedFloat(api_key=api_key, api_secret=api_secret) as client:
        currencies = client.get_currencies()
        print(f"Currencies: {len(currencies)}")
        btc = next((item for item in currencies if item.code == "BTC"), None)
        if btc:
            print(f"{btc.code} {btc.name} recv={btc.recv} send={btc.send}")

        price = client.get_price("BTC", "ETH", 0.01, direction="from", order_type="float")
        errors = ",".join(price.errors or []) or "none"
        print(f"0.01 BTC -> {price.to_side.amount} ETH (errors: {errors})")

        rates = client.get_rates(order_type="float", from_ccy="BTC", to_ccy="ETH")
        if rates:
            row = rates[0]
            print(f"XML rate in={row.in_amount} out={row.out_amount} min={row.min_amount}")


if __name__ == "__main__":
    main()
