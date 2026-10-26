import os

import pytest

from give_sms import GiveSms

api_key = os.getenv("GIVE_SMS_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="GIVE_SMS_API_KEY is not set")
def test_live_balance():
    with GiveSms(api_key=api_key) as client:
        balance = client.get_balance()
        assert isinstance(balance, (int, float))
        counts = client.get_count(country="kazakhstan")
        assert isinstance(counts, dict)
