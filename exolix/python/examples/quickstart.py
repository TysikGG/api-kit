import os
import sys

from exolix import Exolix


def main() -> None:
    api_key = os.environ.get("EXOLIX_API_KEY")
    if not api_key:
        print("Please set EXOLIX_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    with Exolix(api_key=api_key) as client:
        currencies = client.get_currencies(page=1, size=5, with_networks=True)
        print(f"Currencies available: {currencies['count']}")
        sample = [f"{c['name']} ({c['code']})" for c in currencies["data"][:5]]
        print("Sample:", ", ".join(sample))

        networks = client.get_currency_networks("ETH")
        print("\nETH networks:", ", ".join(network["network"] for network in networks))

        quote = client.get_rate(
            "BTC",
            "ETH",
            "float",
            network_from="BTC",
            network_to="ETH",
            amount="0.1",
        )
        print(f"\nEstimated ETH for 0.1 BTC: {quote['toAmount']} (rate {quote['rate']})")


if __name__ == "__main__":
    main()
