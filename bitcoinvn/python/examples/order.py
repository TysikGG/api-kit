"""Create a production order only when BITCOINVN_ALLOW_WRITES=1."""

import os
import sys

from bitcoinvn import BitcoinVn


def main() -> None:
    api_key = os.environ.get("BITCOINVN_API_KEY", "").strip()
    address = os.environ.get("BITCOINVN_SETTLE_ADDRESS", "").strip()
    if not api_key or not address:
        print("Set BITCOINVN_API_KEY and BITCOINVN_SETTLE_ADDRESS.", file=sys.stderr)
        sys.exit(1)
    if os.environ.get("BITCOINVN_ALLOW_WRITES") != "1":
        print("Refusing to create an order. Set BITCOINVN_ALLOW_WRITES=1 to continue.")
        return
    deposit = os.environ.get("BITCOINVN_DEPOSIT_METHOD", "btc")
    settle = os.environ.get("BITCOINVN_SETTLE_METHOD", "usdt")
    amount = float(os.environ.get("BITCOINVN_DEPOSIT_AMOUNT", "0.001"))
    with BitcoinVn(api_key, retries=2) as client:
        quote = client.quote(deposit, settle, amount)
        order = client.fixed_swap(
            str(quote.get("id")),
            address,
            webhook_url=os.environ.get("BITCOINVN_WEBHOOK_URL"),
        )
        print(order["shortId"], order["status"], order["depositData"])
        followed = client.wait_for_order(
            order["shortId"],
            timeout_ms=30_000,
            interval_ms=5_000,
            statuses=["pending", "processing", "completed", "canceled", "settle_data_error"],
        )
        print(followed["status"], followed.get("settleAmount"))


if __name__ == "__main__":
    main()
