import os

import pytest

from stealthex import StealthEX

api_key = os.environ.get("STEALTHEX_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="STEALTHEX_API_KEY not set")
def test_live_currencies_and_estimate():
    client = StealthEX(api_key=api_key)
    currencies = client.get_currencies()
    assert isinstance(currencies, list)
    assert len(currencies) > 0

    est = client.get_estimate("btc", "eth", "0.1")
    assert "estimated_amount" in est
