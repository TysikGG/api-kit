"""Async quote and XML rate lookup.

FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... uv run python examples/async_quote.py
"""

import asyncio
import os

from fixedfloat import AsyncFixedFloat


async def main() -> None:
    async with AsyncFixedFloat(
        api_key=os.getenv("FIXEDFLOAT_API_KEY"),
        api_secret=os.getenv("FIXEDFLOAT_API_SECRET"),
    ) as client:
        price = await client.get_price("BTC", "ETH", 0.01, order_type="float")
        print(f"0.01 BTC -> {price.to_side.amount} {price.to_side.code}")
        rates = await client.get_rates(order_type="fixed", from_ccy="BTC", to_ccy="ETH")
        if rates:
            print(f"Fixed XML out={rates[0].out_amount}")


if __name__ == "__main__":
    asyncio.run(main())
