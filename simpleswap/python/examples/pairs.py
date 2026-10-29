import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        pairs = client.get_pairs("btc", "btc", fixed=False)
        key = next(iter(pairs), "")
        destinations = ", ".join((pairs.get(key) or [])[:8])
        print(f"Floating destinations for {key}: {destinations}")
        fixed = client.get_pairs("btc", "btc", fixed=True)
        print(f"Fixed-rate keys: {len(fixed)}")
        if os.environ.get("SIMPLESWAP_EXAMPLE_ALL_PAIRS") == "1":
            all_pairs = client.get_all_pairs(fixed=False)
            print(f"All floating pair keys: {len(all_pairs)}")
        else:
            print("Set SIMPLESWAP_EXAMPLE_ALL_PAIRS=1 to request GET /v3/pairs.")


if __name__ == "__main__":
    main()
