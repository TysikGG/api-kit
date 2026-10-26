import os

import pytest

from onlinesim import OnlineSim

api_key = os.getenv("ONLINESIM_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="ONLINESIM_API_KEY is not set")
def test_live_balance():
    with OnlineSim(api_key=api_key) as client:
        balance = client.get_balance()
        assert isinstance(balance, (int, float))
