"""Create one production quote. A quote does not move funds."""

import os

from bitcoinvn import BitcoinVn


def main() -> None:
    with BitcoinVn(os.environ.get("BITCOINVN_API_KEY")) as client:
        quote = client.create_quote("btc", "usdt", deposit_amount=0.01)
        print(
            quote.get("id"),
            quote.get("depositAmount"),
            quote.get("settleAmount"),
            quote.get("rate"),
        )


if __name__ == "__main__":
    main()
