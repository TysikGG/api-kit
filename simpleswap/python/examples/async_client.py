import asyncio
import os
import sys

from simpleswap import AsyncSimpleSwap


async def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to run this example.", file=sys.stderr)
        sys.exit(1)

    async with AsyncSimpleSwap(api_key=api_key, max_retries=2, retry_delay=0.2) as client:
        currencies = await client.get_currencies()
        estimate = await client.get_estimate(
            "btc", "eth", "0.1", network_from="btc", network_to="eth", fixed=False
        )
        print(f"Async currencies: {len(currencies)}")
        print(f"Async estimate: {estimate['estimatedAmount']} ETH")


if __name__ == "__main__":
    asyncio.run(main())
