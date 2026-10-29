import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        currencies = client.get_currencies()
        print(f"Supported currencies: {len(currencies)}")
        sample = [f"{item['name']} ({item['ticker']}:{item['network']})" for item in currencies[:5]]
        print("Sample:", ", ".join(sample))
        estimate = client.get_estimate(
            ticker_from="btc",
            ticker_to="eth",
            amount="0.1",
            network_from="btc",
            network_to="eth",
            fixed=False,
        )
        print(f"0.1 BTC -> {estimate['estimatedAmount']} ETH")


if __name__ == "__main__":
    main()
