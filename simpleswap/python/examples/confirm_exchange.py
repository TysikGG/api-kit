"""Confirms a provider deposit when SIMPLESWAP_EXAMPLE_CONFIRM=1."""

import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    public_id = os.environ.get("SIMPLESWAP_EXCHANGE_ID")
    if not api_key or not public_id:
        print("Set SIMPLESWAP_API_KEY and SIMPLESWAP_EXCHANGE_ID.", file=sys.stderr)
        sys.exit(1)
    if os.environ.get("SIMPLESWAP_EXAMPLE_CONFIRM") != "1":
        print("Set SIMPLESWAP_EXAMPLE_CONFIRM=1 to send PUT /v3/exchanges.")
        return

    with SimpleSwap(api_key=api_key) as client:
        order = client.confirm_exchange(
            public_id,
            tx_from=os.environ.get("SIMPLESWAP_TX_FROM"),
            provider_user_deposit_address=os.environ.get("SIMPLESWAP_DEPOSIT_ADDRESS"),
            target_address=os.environ.get("SIMPLESWAP_ADDRESS_TO"),
        )
        print(f"Status after confirm: {order.get('status')}")


if __name__ == "__main__":
    main()
