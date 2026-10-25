import os

import pytest

from swapzone import Swapzone

api_key = os.environ.get("SWAPZONE_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="SWAPZONE_API_KEY not set")
def test_live_currencies_and_rate():
    client = Swapzone(api_key=api_key)
    currencies = client.get_currencies()
    assert isinstance(currencies, list)
    assert len(currencies) > 0

    rate = client.get_rate("btc", "eth", "0.1")
    assert "amountTo" in rate
    assert "adapter" in rate
