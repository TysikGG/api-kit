"""Public market reads. Does not create an order."""

from bitcoinvn import BitcoinVn


def main() -> None:
    with BitcoinVn() as client:
        health = client.get_health()
        info = client.get_info()
        active = [
            method
            for method in info["transferMethods"].values()
            if method.get("depositEnabled") or method.get("settleEnabled")
        ]
        ticker = client.get_ticker("BTC", "USDT")
        pair = client.get_pair("btc", "usdt")
        offers = client.list_staking_offers()
        print(health["status"])
        print("assets", len(info["assets"]))
        print("active methods", len(active))
        print("BTC/USDT", ticker["rate"], ticker["volume24h"])
        print("btc->usdt", pair["rate"], pair["min"], pair.get("max"))
        print("offers", len(offers))
        print(client.swap_url("btc", "usdt"))


if __name__ == "__main__":
    main()
