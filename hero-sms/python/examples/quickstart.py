"""Quickstart example demonstrating safe read-only queries with HeroSMS."""

import os
import sys

from hero_sms import HeroSMS, HeroSMSError


def main() -> None:
    api_key = os.environ.get("HERO_SMS_API_KEY", "YOUR_API_KEY")

    try:
        with HeroSMS(api_key=api_key) as client:
            print("Checking account balance...")
            balance = client.get_balance()
            print(f"Current balance: ${balance:.2f}")

            print("Fetching available countries...")
            countries = client.get_countries()
            print(f"Total available countries: {len(countries)}")

            # Show a few sample countries
            for cid, cinfo in list(countries.items())[:3]:
                print(f"  ID {cid}: {cinfo.get('eng')} / {cinfo.get('rus')}")

    except HeroSMSError as err:
        print(f"HeroSMS error [{err.code}]: {err.message}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
