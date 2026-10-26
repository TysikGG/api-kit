import os
import sys

from stealthex import StealthEX


def main() -> None:
    api_key = os.environ.get("STEALTHEX_API_KEY")
    if not api_key:
        print("Please set STEALTHEX_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    with StealthEX(api_key=api_key) as client:
        currencies = client.get_currencies()
        print(f"Currencies count: {len(currencies)}")
        sample = [f"{c['name']} ({c['symbol'].upper()})" for c in currencies[:5]]
        print("Sample:", ", ".join(sample))

        est = client.get_estimate("btc", "eth", "0.1")
        print(f"\n0.1 BTC -> {est['estimated_amount']} ETH")


if __name__ == "__main__":
    main()
