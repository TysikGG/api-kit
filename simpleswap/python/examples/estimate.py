import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        floating = client.get_estimate(
            "btc", "eth", "0.1", network_from="btc", network_to="eth", fixed=False, reverse=False
        )
        print(f"Floating: {floating['estimatedAmount']} ETH")
        reversed_quote = client.get_estimated(
            "btc", "eth", "1", network_from="btc", network_to="eth", fixed=False, reverse=True
        )
        print(f"BTC required to receive about 1 ETH: {reversed_quote['estimatedAmount']}")
        fixed = client.get_estimate(
            "btc",
            "eth",
            "0.1",
            network_from="btc",
            network_to="eth",
            fixed=True,
            custom_fee="0.4",
        )
        print(
            f"Fixed quote: {fixed['estimatedAmount']} ETH, "
            f"rateId={fixed.get('rateId')}, until={fixed.get('validUntil')}"
        )


if __name__ == "__main__":
    main()
