import os
import sys

from simpleswap import SimpleSwap, exchange_public_id


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        orders = client.get_exchanges(limit=5, offset=0)
        print(f"Recent exchanges: {len(orders)}")
        for order in orders:
            print(
                exchange_public_id(order),
                order.get("status"),
                order.get("tickerFrom"),
                "->",
                order.get("tickerTo"),
            )
        chosen = os.environ.get("SIMPLESWAP_EXCHANGE_ID")
        if not chosen and orders:
            chosen = exchange_public_id(orders[0])
        if not chosen:
            print("No exchange id available. Set SIMPLESWAP_EXCHANGE_ID.")
            return
        one = client.get_exchange(chosen)
        print(f"get_exchange {chosen}: {one.get('status')}")


if __name__ == "__main__":
    main()
