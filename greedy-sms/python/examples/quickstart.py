"""Quickstart example demonstrating safe read-only queries with Greedy SMS."""

import os
import sys

from greedy_sms import GreedySMS, GreedySMSError


def main() -> None:
    api_key = os.environ.get("GREEDY_SMS_API_KEY", "YOUR_API_KEY")

    try:
        with GreedySMS(api_key=api_key) as client:
            print("Checking API health...")
            health = client.check_health()
            print(f"API Health: {health['status']}")

            print("Fetching user profile and balance...")
            me = client.get_me()
            print(f"Account ID: {me['id']}")
            print(f"Current balance: {me['balance']} RUB")
            print(f"Referral balance: {me['referralBalance']} RUB")
            print(f"Total activations: {me['purchases']['activations']}")

            print("Fetching available countries...")
            countries_res = client.get_countries(page=1, page_size=5)
            print(f"Total countries: {countries_res['total']}")
            for c in countries_res["countries"]:
                print(f"  [{c['id']}] {c['title']['eng']} ({c['title']['rus']})")

    except GreedySMSError as err:
        print(f"Greedy SMS error [{err.code}]: {err.message}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
