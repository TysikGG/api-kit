"""List staking offers. Preference changes require BITCOINVN_ALLOW_WRITES=1."""

import os

from bitcoinvn import BitcoinVn


def main() -> None:
    with BitcoinVn(os.environ.get("BITCOINVN_API_KEY")) as client:
        for offer in client.list_staking_offers():
            print(offer["id"], offer["asset"], offer["latestApr"], offer["staked"])
        offer_id = os.environ.get("BITCOINVN_OFFER_ID", "").strip()
        if not offer_id or os.environ.get("BITCOINVN_ALLOW_WRITES") != "1":
            print("Set BITCOINVN_OFFER_ID and BITCOINVN_ALLOW_WRITES=1 to change preferences.")
            return
        print(client.set_auto_stake(offer_id, True))
        print(client.set_staking_notifications(offer_id, False))


if __name__ == "__main__":
    main()
