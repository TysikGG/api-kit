# BitcoinVN — Python

The `bitcoinvn` client calls the [BitcoinVN Exchange API](https://bitcoinvn.io/api/doc.json). The base URL is `https://bitcoinvn.io`.

Create a key on the API keys page at [bitcoinvn.io](https://bitcoinvn.io) and pass it as `BITCOINVN_API_KEY`. Public reads work without a key. The specification has no key-management API.

```sh
pip install bitcoinvn
```

Check the client without creating an order:

```python
import os

from bitcoinvn import BitcoinVn


def main() -> None:
    api_key = os.environ.get("BITCOINVN_API_KEY")
    with BitcoinVn(api_key) as client:
        ticker = client.get_ticker("BTC", "USDT")
        print(ticker["rate"], ticker["volume24h"])


if __name__ == "__main__":
    main()
```

Source: `bitcoinvn/python/examples/check.py`.

`create_quote` creates a live quote. `create_order` creates a live order and always sends the hardcoded `referrer` in the JSON body. Those calls are not part of the check example.

The generated method reference is in [docs/bitcoinvn/python/bitcoinvn.md](bitcoinvn/python/bitcoinvn.md).
