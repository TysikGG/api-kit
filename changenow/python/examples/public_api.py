"""Anonymous catalogue, version-3 quote, and legacy v1 reads.

No API key. Does not create an exchange.

    uv run python examples/public_api.py
"""

from changenow import (
    ChangeNow,
    ChangeNowError,
    build_exchange_link,
    is_terminal_exchange_status,
    parse_exchange_webhook,
    split_asset_id,
)


def main() -> None:
    print("split", split_asset_id("usdt.trx"))
    print(
        build_exchange_link(
            "btc",
            "eth",
            amount="0.1",
            fixed_rate=True,
            lang="de",
        )
    )
    print(build_exchange_link("usd", "btc", amount="100", fiat_mode=True))
    event = parse_exchange_webhook({"id": "example", "status": "finished"})
    print("terminal", is_terminal_exchange_status(event["status"]))

    with ChangeNow(retries=2, timeout=30) as client:
        page = client.list_assets(limit=2, network="btc", kind="crypto")
        print("assets", page["returned"], page["assets"][0]["ticker"])
        csv_text = client.list_assets(format="csv", network="btc")
        print("csv chars", len(csv_text))
        print("asset manual", len(client.get_asset_manual()))
        few = client.list_all_assets(network="btc", limit=2, max_pages=1)
        print("list_all", len(few))
        asset = client.get_asset("btc")
        print("asset", asset.get("ticker") or asset.get("id"))

        estimate = client.get_public_estimate(
            "btc",
            "btc",
            "eth",
            "eth",
            from_amount="0.1",
            flow="standard",
            type="direct",
        )
        print("quote", estimate.get("quote"))
        client.get_public_estimate(
            "btc",
            "btc",
            "eth",
            "eth",
            to_amount="1",
            flow="fixed-rate",
            type="reverse",
        )
        print("v3 manual", len(client.get_public_manual()))

        currencies = client.get_currencies_v1(active=True)
        print("v1 currencies", len(currencies))
        print("v1 targets", len(client.get_currencies_to_v1("btc")))
        print("v1 info", client.get_currency_info_v1("btc").get("ticker"))
        print("v1 min", client.get_min_amount_v1("btc", "eth"))
        print("v1 amount", client.get_exchange_amount_v1("0.1", "btc", "eth"))
        print("v1 range", client.get_exchange_range_v1("btc", "eth"))
        pairs = client.get_market_pairs_v1()
        print("v1 pairs", len(pairs), pairs[0] if pairs else None)
        try:
            check = client.validate_address_v1(
                "eth", "0x57f31ad4b64095347F87eDB1675566DAfF5EC886"
            )
            print("v1 address", check.get("result"))
        except ChangeNowError as exc:
            print("v1 address check", exc.status_code, exc)


if __name__ == "__main__":
    main()
