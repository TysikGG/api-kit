import os

import pytest

from twocaptcha import TwoCaptchaClient

api_key = os.getenv("TWOCAPTCHA_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="TWOCAPTCHA_API_KEY is not set")
def test_live_balance():
    with TwoCaptchaClient(api_key=api_key) as client:
        balance = client.get_balance()
        assert isinstance(balance, (int, float))
