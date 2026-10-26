"""Quickstart example for the SMSBower Python client."""

import os
import sys

from smsbower import SmsBowerClient


def main() -> None:
    api_key = os.environ.get("SMSBOWER_API_KEY")
    if not api_key:
        print("Please set the SMSBOWER_API_KEY environment variable", file=sys.stderr)
        sys.exit(1)

    with SmsBowerClient(api_key=api_key) as client:
        balance = client.get_balance()
        print(f"SMSBower Balance: ${balance:.2f}")

        services = client.get_services_list()
        print(f"Total services available: {len(services)}")
        if services:
            print("First service:", services[0])

        countries = client.get_countries()
        print(f"Total countries available: {len(countries)}")


if __name__ == "__main__":
    main()
