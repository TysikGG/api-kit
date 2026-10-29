import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key) as client:
        currencies = client.get_all_currencies()
        print(f"get_currencies / get_all_currencies: {len(currencies)}")
        btc = client.get_currency("btc", "btc")
        extra = btc.get("extraId") if btc.get("hasExtraId") else "none"
        print(f"{btc.get('name')} extra id: {extra}")
        print(f"Address pattern: {btc.get('validationAddress')}")


if __name__ == "__main__":
    main()
