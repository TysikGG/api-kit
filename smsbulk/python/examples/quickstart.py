import os
import sys

from smsbulk import SMSBulk


def main() -> None:
    api_key = os.environ.get("SMSBULK_API_KEY")
    if not api_key:
        print("Please set SMSBULK_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    with SMSBulk(api_key=api_key) as client:
        # Check wallet balance
        bal = client.get_balance()
        print(f"Balance: {bal['balance']} {bal['currency']}")

        # List first 5 services
        services = client.get_services()
        print(f"\nAvailable Services ({services['count']} total):")
        for s in services["data"][:5]:
            msg = f"- {s['name']} ({s['code']}): min ${s['minPrice']}, stock {s['totalStock']}"
            print(msg)

        # List first 5 countries
        countries = client.get_countries()
        print(f"\nAvailable Countries ({countries['count']} total):")
        for c in countries["data"][:5]:
            print(f"- {c['name']} ({c['isoCode']}) {c.get('flagEmoji', '')}")


if __name__ == "__main__":
    main()
