import os

import pytest

from simpleswap import SimpleSwap

api_key = os.environ.get("SIMPLESWAP_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="SIMPLESWAP_API_KEY not set")
def test_live_currencies_and_estimate():
    client = SimpleSwap(api_key=api_key)
    currencies = client.get_currencies()
    assert isinstance(currencies, list)
    assert len(currencies) > 0

    est = client.get_estimate(
        ticker_from="btc",
        ticker_to="eth",
        network_from="btc",
        network_to="eth",
        amount="0.1",
    )
    assert "estimatedAmount" in est

    btc = client.get_currency("btc", "btc")
    assert btc.get("ticker")

    pairs = client.get_pairs("btc", "btc", fixed=False)
    assert isinstance(pairs, dict)

    ranges = client.get_ranges("btc", "eth", network_from="btc", network_to="eth")
    assert "min" in ranges
