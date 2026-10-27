import os
import sys

from changenow import ChangeNow


def main() -> None:
    api_key = os.environ.get("CHANGENOW_API_KEY")
    if not api_key:
        print("Please set CHANGENOW_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    with ChangeNow(api_key=api_key) as client:
        currencies = client.get_currencies(active=True, flow="standard")
        print(f"Currencies count: {len(currencies)}")
        sample = [f"{c['name']} ({c['ticker']}/{c['network']})" for c in currencies[:5]]
        print("Sample:", ", ".join(sample))

        minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
        print(f"\nMinimum BTC -> ETH: {minimum['minAmount']}")

        estimate = client.get_estimated_amount(
            "btc",
            "eth",
            from_amount="0.1",
            from_network="btc",
            to_network="eth",
            flow="standard",
        )
        print(f"Estimated ETH for 0.1 BTC: {estimate['toAmount']}")

        check = client.validate_address("eth", "0x57f31ad4b64095347F87eDB1675566DAfF5EC886")
        print(f"Sample address valid: {check['result']}")


if __name__ == "__main__":
    main()
