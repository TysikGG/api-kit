import os

import pytest

from bitcoinvn import BitcoinVn


@pytest.mark.live
def test_live_ticker() -> None:
    key = os.environ.get("BITCOINVN_API_KEY", "").strip()
    if not key:
        pytest.skip("BITCOINVN_API_KEY is not set")
    with BitcoinVn(key) as client:
        health = client.get_health()
        ticker = client.get_ticker("BTC", "USDT")
        pair = client.get_pair("btc", "usdt")
        offers = client.list_staking_offers()
    assert health["status"] == "ok"
    assert isinstance(ticker["rate"], (int, float))
    assert isinstance(ticker["volume24h"], (int, float))
    assert isinstance(pair["rate"], (int, float))
    assert isinstance(offers, list)
