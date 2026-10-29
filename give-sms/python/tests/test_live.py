import os

import pytest

from give_sms import GiveSms

api_key = os.getenv("GIVE_SMS_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="GIVE_SMS_API_KEY is not set")
def test_live_read_only():
    with GiveSms(api_key=api_key or "") as client:
        balance = client.get_balance()
        assert isinstance(balance, (int, float))
        counts = client.get_count(country="kazakhstan")
        assert isinstance(counts, dict)
        handler_balance = client.handler_get_balance()
        assert isinstance(handler_balance, float)
        prices = client.handler_get_prices(country=2, service="tg")
        assert prices is not None
        countries = client.rent_countries()
        assert isinstance(countries, dict)
