import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        market = client.get_market_info()
        print(f"Fixed-rate market rows: {len(market)}")
        for row in market[:5]:
            print(
                f"{row.get('tickerFrom')}:{row.get('networkFrom')} -> "
                f"{row.get('tickerTo')}:{row.get('networkTo')} "
                f"rate={row.get('rate')} min={row.get('min')} max={row.get('max')}"
            )


if __name__ == "__main__":
    main()
