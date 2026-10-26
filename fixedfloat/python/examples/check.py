"""Example checking FixedFloat currencies and price without spending balance."""

import os

from fixedfloat import FixedFloat


def main() -> None:
    api_key = os.getenv("FIXEDFLOAT_API_KEY")
    api_secret = os.getenv("FIXEDFLOAT_API_SECRET")

    with FixedFloat(api_key=api_key, api_secret=api_secret) as client:
        print("Fetching currencies from FixedFloat...")
        currencies = client.get_currencies()
        print(f"Success! Found {len(currencies)} currencies.")

        btc = next((c for c in currencies if c.code == "BTC"), None)
        eth = next((c for c in currencies if c.code == "ETH"), None)
        if btc and eth:
            print(f"BTC: {btc.name} (network: {btc.network})")
            print(f"ETH: {eth.name} (network: {eth.network})")

        print("\nChecking exchange rate for BTC to ETH...")
        price = client.get_price(
            from_ccy="BTC",
            to_ccy="ETH",
            amount=0.1,
            direction="from",
            order_type="float",
        )
        print(f"0.1 BTC -> {price.to_side.amount} ETH (Rate: {price.to_side.rate})")


if __name__ == "__main__":
    main()
