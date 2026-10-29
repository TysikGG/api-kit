"""Validate an address. Optionally resolve an ENS name."""

import os

from bitcoinvn import BitcoinVn


def main() -> None:
    address = os.environ.get("BITCOINVN_ADDRESS", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")
    with BitcoinVn() as client:
        checked = client.validate_address("btc", address)
        print("valid", checked["valid"], checked.get("error") or "")
        name = os.environ.get("BITCOINVN_ENS_NAME")
        if not name:
            print("Set BITCOINVN_ENS_NAME to resolve an ENS name.")
            return
        resolved = client.resolve_address("eth", name)
        print(resolved["address"], resolved["ensResolutionToken"], resolved["expiresAt"])


if __name__ == "__main__":
    main()
