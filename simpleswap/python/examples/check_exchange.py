import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        check = client.check_exchange(
            "btc", "eth", "0.1", network_from="btc", network_to="eth", fixed=False, reverse=False
        )
        print(f"Can create a floating 0.1 BTC -> ETH exchange: {check['canCreate']}")


if __name__ == "__main__":
    main()
