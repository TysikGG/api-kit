"""Async read of the balance and the country catalog. Does not buy a number."""

import asyncio
import os

from grizzly_sms import AsyncGrizzlySms


async def main() -> None:
    async with AsyncGrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
        balance = await sms.get_balance()
        countries = await sms.get_countries()
        print(balance, len(countries))


if __name__ == "__main__":
    asyncio.run(main())
