import os
import sys

from simpleswap import SimpleSwap


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(
        api_key=api_key,
        base_url=os.environ.get("SIMPLESWAP_BASE_URL"),
        timeout=20,
        max_retries=2,
        retry_delay=0.2,
        proxy=os.environ.get("SIMPLESWAP_PROXY"),
        client_ip=os.environ.get("SIMPLESWAP_CLIENT_IP"),
        polling_interval=4,
        polling_timeout=180,
    ) as client:
        ranges = client.get_ranges("btc", "eth", network_from="btc", network_to="eth")
        print(f"Min BTC after optional proxy and retries: {ranges.get('min')}")


if __name__ == "__main__":
    main()
