import os

import pytest

from sideshift import SideShift

run_live = os.getenv("SIDESHIFT_LIVE") == "true"


@pytest.mark.live
@pytest.mark.skipif(not run_live, reason="SIDESHIFT_LIVE is not true")
def test_live_coins():
    with SideShift() as client:
        coins = client.get_coins()
        assert len(coins) > 0
        pair = client.get_pair("eth", "ethereum", "btc", "bitcoin")
        assert float(pair.rate) > 0
