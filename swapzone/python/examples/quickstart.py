import os
import sys

from swapzone import Swapzone


def main() -> None:
    api_key = os.environ.get("SWAPZONE_API_KEY")
    if not api_key:
        print("Please set SWAPZONE_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    with Swapzone(api_key=api_key) as client:
        currencies = client.get_currencies()
        print(f"Supported currencies: {len(currencies)}")
        sample = [f"{c['name']} ({c['ticker'].upper()})" for c in currencies[:5]]
        print("Sample:", ", ".join(sample))

        rate = client.get_rate("btc", "eth", "0.1")
        print(f"\n0.1 BTC -> {rate['amountTo']} ETH via {rate['adapter']}")


if __name__ == "__main__":
    main()
