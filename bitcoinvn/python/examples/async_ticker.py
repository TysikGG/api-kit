"""Async public ticker. Does not create an order."""

import asyncio

from bitcoinvn import AsyncBitcoinVn


async def main() -> None:
    async with AsyncBitcoinVn(retries=2) as client:
        ticker = await client.get_ticker("BTC", "USDT")
        print(ticker["rate"], ticker["volume24h"])


if __name__ == "__main__":
    asyncio.run(main())
