"""Poll an existing order. Read-only. BITCOINVN_ORDER_ID is the short id."""

import os
import sys

from bitcoinvn import BitcoinVn, BitcoinVnTimeoutError


def main() -> None:
    order_id = os.environ.get("BITCOINVN_ORDER_ID", "").strip()
    if not order_id:
        print("Set BITCOINVN_ORDER_ID.", file=sys.stderr)
        sys.exit(1)
    with BitcoinVn(os.environ.get("BITCOINVN_API_KEY"), retries=2) as client:
        try:
            order = client.wait_for_order(order_id, timeout_ms=20_000, interval_ms=3_000)
        except BitcoinVnTimeoutError as error:
            print("still", error.order.get("status") if error.order else None)
            return
        print(order["shortId"], order["status"], order.get("settleAmount"))


if __name__ == "__main__":
    main()
