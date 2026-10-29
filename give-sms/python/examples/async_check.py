"""Async read-only balance check.

    GIVE_SMS_API_KEY=... uv run python examples/async_check.py
"""

import asyncio
import os

from give_sms import AsyncGiveSms


async def main() -> None:
    api_key = os.getenv("GIVE_SMS_API_KEY")
    if not api_key:
        print("Set GIVE_SMS_API_KEY to call Give-SMS. Nothing was ordered.")
        return
    async with AsyncGiveSms(api_key) as client:
        print(f"Balance: {await client.get_balance()}")
        counts = await client.get_count(country="kazakhstan")
        print(f"Operators in the Kazakhstan catalog: {len(counts)}")


if __name__ == "__main__":
    asyncio.run(main())
