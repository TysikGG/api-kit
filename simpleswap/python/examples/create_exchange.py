"""Creates a real exchange when SIMPLESWAP_EXAMPLE_CREATE=1."""

import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    address = os.environ.get("SIMPLESWAP_ADDRESS_TO", "0x" + "00" * 20)
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    print("Would create btc:btc -> eth:eth amount 0.1 to", address)
    if os.environ.get("SIMPLESWAP_EXAMPLE_CREATE") != "1":
        print("Set SIMPLESWAP_EXAMPLE_CREATE=1 to POST /v3/exchanges.")
        return

    with SimpleSwap(api_key=api_key) as client:
        order = client.create_exchange(
            ticker_from="btc",
            ticker_to="eth",
            amount="0.1",
            address_to=address,
            network_from="btc",
            network_to="eth",
            fixed=False,
            reverse=False,
            user_refund_address=os.environ.get("SIMPLESWAP_REFUND_ADDRESS"),
            user_refund_extra_id=os.environ.get("SIMPLESWAP_REFUND_EXTRA_ID"),
            rate_id=os.environ.get("SIMPLESWAP_RATE_ID"),
            custom_fee=os.environ.get("SIMPLESWAP_CUSTOM_FEE"),
        )
        public_id = order.get("publicId") or order.get("id")
        print(f"Deposit {order.get('amountFrom')} to {order.get('addressFrom')}")
        print(f"Public id: {public_id}, status: {order.get('status')}")


if __name__ == "__main__":
    main()
