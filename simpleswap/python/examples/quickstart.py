import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Please set SIMPLESWAP_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        currencies = client.get_currencies()
        print(f"Supported currencies: {len(currencies)}")
        sample = [f"{c['name']} ({c['ticker'].upper()})" for c in currencies[:5]]
        print("Sample:", ", ".join(sample))

        est = client.get_estimate(
            ticker_from="btc",
            ticker_to="eth",
            network_from="btc",
            network_to="eth",
            amount="0.1",
        )
        print(f"\n0.1 BTC -> {est['estimatedAmount']} ETH")


if __name__ == "__main__":
    main()
