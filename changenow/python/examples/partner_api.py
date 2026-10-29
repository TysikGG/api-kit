"""Partner v2 and keyed v1 reads.

Creates an order only when CHANGENOW_RUN_WRITES=1.

    CHANGENOW_API_KEY=... uv run python examples/partner_api.py
"""

import os
import sys
from collections.abc import Callable

from changenow import ChangeNow, ChangeNowError


def optional(label: str, run: Callable[[], object]) -> None:
    try:
        value = run()
    except ChangeNowError as exc:
        print(label, "skipped:", exc.status_code, exc)
        return
    size = len(value) if isinstance(value, list) else "ok"
    print(label, size)


def main() -> None:
    api_key = os.environ.get("CHANGENOW_API_KEY")
    if not api_key:
        print("Please set CHANGENOW_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    with ChangeNow(api_key=api_key, timeout=30) as client:
        currencies = client.get_currencies(active=True, flow="standard")
        print("currencies", len(currencies))
        pairs = client.get_available_pairs(
            from_currency="btc", from_network="btc", flow="standard"
        )
        print("pairs", len(pairs))
        minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
        print("min", minimum["minAmount"])
        bounds = client.get_range("btc", "eth", "btc", "eth", flow="fixed-rate")
        print("range", bounds.get("minAmount"), bounds.get("maxAmount"))
        estimate = client.get_estimated_amount(
            "btc",
            "eth",
            from_amount="0.1",
            from_network="btc",
            to_network="eth",
            flow="standard",
            type="direct",
        )
        print("estimate", estimate["toAmount"])
        locked = client.get_estimated_amount(
            "btc",
            "eth",
            from_amount="0.1",
            from_network="btc",
            to_network="eth",
            flow="fixed-rate",
            use_rate_id=True,
        )
        print("rateId", locked.get("rateId"))
        reverse = client.get_estimated_amount(
            "btc",
            "eth",
            to_amount="1",
            from_network="btc",
            to_network="eth",
            type="reverse",
            flow="standard",
        )
        print("reverse", reverse.get("fromAmount"))
        top_up = client.get_estimated_amount(
            "btc",
            "eth",
            from_amount="0.1",
            from_network="btc",
            to_network="eth",
            is_top_up=True,
        )
        print("top-up", top_up.get("toAmount"))
        check = client.validate_address(
            "eth", "0x57f31ad4b64095347F87eDB1675566DAfF5EC886"
        )
        print("address", check["result"])
        named = client.get_user_addresses("example.crypto")
        print("name", named.get("success"))
        fees = client.get_network_fee(
            "usdt",
            "usdt",
            "100",
            from_network="eth",
            to_network="trx",
            flow="standard",
        )
        print("fee", fees["estimatedFee"]["withdrawal"]["amount"])
        market = client.get_market_estimate("usd", "btc", from_amount="1000", type="direct")
        print("market", market["toAmount"])
        optional("exchanges", lambda: client.get_exchanges(limit=10, offset=0))
        optional(
            "fixed v1",
            lambda: client.get_fixed_rate_amount_v1("0.1", "btc", "eth", use_rate_id=True),
        )
        optional("v1 list", lambda: client.list_transactions_v1(limit=5))
        quote = client.get_private_transfer_estimate("eth", "eth", "0.05")
        print("private rateId", quote.get("rateId"))

        if os.environ.get("CHANGENOW_RUN_WRITES") != "1":
            print("Skipping create, push, and refund. Set CHANGENOW_RUN_WRITES=1 to run them.")
            return

        payout = os.environ.get(
            "CHANGENOW_PAYOUT_ADDRESS",
            "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
        )
        created = client.create_exchange(
            "btc",
            "eth",
            payout,
            from_network="btc",
            to_network="eth",
            from_amount=str(minimum["minAmount"]),
            flow="standard",
        )
        print("created", created["id"], created.get("payinAddress"))
        status = client.get_exchange(created["id"])
        client.get_transaction(created["id"])
        client.get_transaction_status(created["id"])
        print("status", status["status"])
        actions = client.get_exchange_actions(created["id"])
        print("actions", actions)
        push = actions.get("continue") or {}
        if push.get("available"):
            print("continue", client.continue_exchange(created["id"]))
        refund = actions.get("refund") or {}
        if refund.get("available"):
            print("refund", client.refund_exchange(created["id"]))


if __name__ == "__main__":
    main()
