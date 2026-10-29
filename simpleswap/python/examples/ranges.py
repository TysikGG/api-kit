import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        floating = client.get_ranges("btc", "eth", "btc", "eth", fixed=False, reverse=False)
        print(f"Floating min {floating.get('min')}, max {floating.get('max') or 'none'}")
        print(f"get_min (legacy helper): {client.get_min('btc', 'eth', 'btc', 'eth', fixed=False)}")
        reversed_range = client.get_ranges("btc", "eth", "btc", "eth", reverse=True)
        print(f"Reverse range min {reversed_range.get('min')}, max {reversed_range.get('max')}")


if __name__ == "__main__":
    main()
