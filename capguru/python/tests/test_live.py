import os

import pytest

from capguru import AsyncCapGuruClient, CapGuruClient

api_key = os.getenv("CAPGURU_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="CAPGURU_API_KEY is not set")
def test_live_balance():
    with CapGuruClient(api_key=api_key) as client:
        balance = client.get_balance()
        assert isinstance(balance, (int, float))


@pytest.mark.live
@pytest.mark.asyncio
@pytest.mark.skipif(not api_key, reason="CAPGURU_API_KEY is not set")
async def test_live_balance_async():
    async with AsyncCapGuruClient(api_key=api_key) as client:
        balance = await client.get_balance()
        assert isinstance(balance, (int, float))
