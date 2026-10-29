"""Async balance check. Reads the account and does not create a task.

CAPGURU_API_KEY=... uv run python examples/async_balance.py
"""

import asyncio
import os
import sys

from capguru import AsyncCapGuruClient


async def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    if not api_key:
        print("Set CAPGURU_API_KEY", file=sys.stderr)
        raise SystemExit(1)
    async with AsyncCapGuruClient(api_key) as client:
        print(await client.get_balance())


if __name__ == "__main__":
    asyncio.run(main())
