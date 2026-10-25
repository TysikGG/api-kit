"""Read a public ticker. Does not create an order."""

import os

from bitcoinvn import BitcoinVn


def main() -> None:
    api_key = os.environ.get("BITCOINVN_API_KEY")
    with BitcoinVn(api_key) as client:
        ticker = client.get_ticker("BTC", "USDT")
        print(ticker["rate"], ticker["volume24h"])


if __name__ == "__main__":
    main()
