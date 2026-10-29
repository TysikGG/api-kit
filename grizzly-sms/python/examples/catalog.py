"""Read-only catalog: prices, stock, services, open activations, and the wallet."""

import os

from grizzly_sms import GrizzlySms


def main() -> None:
    with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
        balance = sms.get_balance(version=2)
        quotes = sms.find_prices(service="tg", max_price=1, min_count=1)
        stock = sms.get_numbers_status(country=0)
        services = sms.get_services()
        active = sms.get_active_activations()
        wallet = sms.get_wallet(coin="usdt", network="tron")
        telegram = next((row for row in stock if row.service == "tg"), None)
        print(balance)
        print(quotes[0] if quotes else None)
        print(telegram)
        print(len(services), len(active), wallet.wallet_address)


if __name__ == "__main__":
    main()
