import os

import pytest

from sms_man import SmsMan

token = os.getenv("SMSMAN_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not token, reason="SMSMAN_API_KEY is not set")
def test_live_balance():
    with SmsMan(token=token) as client:
        balance = client.get_balance()
        assert isinstance(balance, (int, float))
