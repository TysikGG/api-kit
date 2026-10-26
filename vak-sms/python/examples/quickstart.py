"""Quickstart example for the VAK-SMS Python client."""

import os
import sys

from vak_sms import VakSmsClient


def main() -> None:
    api_key = os.environ.get("VAK_SMS_API_KEY")
    if not api_key:
        print("Please set the VAK_SMS_API_KEY environment variable", file=sys.stderr)
        sys.exit(1)

    with VakSmsClient(api_key=api_key) as client:
        balance = client.get_balance()
        print(f"VAK-SMS Balance: {balance:.2f} RUB")

        countries = client.get_country_list()
        print(f"Supported countries: {len(countries)}")
        if countries:
            print("First country:", countries[0].country_name)


if __name__ == "__main__":
    main()
