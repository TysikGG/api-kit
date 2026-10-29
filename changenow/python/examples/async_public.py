"""Same public reads as public_api.py, through AsyncChangeNow.

    uv run python examples/async_public.py
"""

import asyncio

from changenow import AsyncChangeNow, split_asset_id


async def main() -> None:
    print(split_asset_id("btc"))
    async with AsyncChangeNow(retries=2, timeout=30) as client:
        page = await client.list_assets(limit=2, network="btc")
        print("assets", page["returned"])
        quote = await client.get_public_estimate(
            "btc", "btc", "eth", "eth", from_amount="0.1", flow="standard"
        )
        print("quote", quote.get("quote"))
        currencies = await client.get_currencies_v1(active=True)
        print("v1 currencies", len(currencies))
        minimum = await client.get_min_amount_v1("btc", "eth")
        print("v1 min", minimum)
        await client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
