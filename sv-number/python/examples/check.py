"""Safe verification script: checks account balance without renting numbers."""

import os

from sv_number import SvNumber


def main() -> None:
    api_key = os.environ.get("SV_NUMBER_API_KEY")
    if not api_key:
        raise SystemExit("Please set SV_NUMBER_API_KEY environment variable")

    with SvNumber(api_key) as client:
        balance = client.get_balance()
        services = client.get_services_and_cost(country=0)
        print(f"Account balance: ${balance}")
        print(f"Available services in country 0: {len(services)}")


if __name__ == "__main__":
    main()
