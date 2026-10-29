"""Spends balance. Solve a Turnstile widget.

    CAPMONSTER_API_KEY=... uv run python examples/solve_turnstile.py
"""

import asyncio
import os

from capmonster import AsyncCapMonster, turnstile


async def main() -> None:
    client_key = os.environ.get("CAPMONSTER_API_KEY")
    if not client_key:
        raise SystemExit("Set CAPMONSTER_API_KEY")

    async with AsyncCapMonster(client_key) as client:
        user_agent = await client.get_user_agent()
        solution = await client.solve(
            turnstile("https://example.com/", "0x4AAAAAAA...", userAgent=user_agent)
        )
        print(solution.get("token"))


if __name__ == "__main__":
    asyncio.run(main())
