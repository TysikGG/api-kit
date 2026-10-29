"""Read-only account calls. Requires BITCOINVN_API_KEY."""

import os
import sys

from bitcoinvn import BitcoinVn


def main() -> None:
    api_key = os.environ.get("BITCOINVN_API_KEY", "").strip()
    if not api_key:
        print("Set BITCOINVN_API_KEY.", file=sys.stderr)
        sys.exit(1)
    with BitcoinVn(api_key) as client:
        print("balances", client.get_balances())
        orders = client.list_orders(page=1)
        print("orders", [order["shortId"] for order in orders])
        print("ledger rows", len(client.list_balance_history(page=1)))
        print(client.get_guarantee_public_key()[:40])


if __name__ == "__main__":
    main()
