import os

import pytest

from smsbulk import SMSBulk

api_key = os.environ.get("SMSBULK_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="SMSBULK_API_KEY not set")
def test_live_balance_and_services():
    client = SMSBulk(api_key=api_key)
    bal = client.get_balance()
    assert "balance" in bal
    assert bal.get("currency") == "USD"

    services = client.get_services()
    assert services.get("count", 0) > 0

    countries = client.get_countries()
    assert countries.get("count", 0) > 0
