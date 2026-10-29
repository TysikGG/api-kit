"""Async balance check. Does not spend credits.

PEAK_API_KEY=pk_... uv run python examples/async_balance.py
"""

import asyncio
import os

from peak import AsyncPeak, format_balance


async def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    if not api_key:
        raise SystemExit("Set PEAK_API_KEY to your Peak API key.")

    async with AsyncPeak(api_key) as client:
        balance = await client.get_balance()
        print(format_balance(balance))


if __name__ == "__main__":
    asyncio.run(main())
