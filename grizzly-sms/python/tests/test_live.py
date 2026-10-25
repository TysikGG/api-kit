import os

import pytest

from grizzly_sms import GrizzlySms


@pytest.mark.live
def test_live_balance() -> None:
    key = os.environ.get("GRIZZLY_API_KEY", "").strip()
    if not key:
        pytest.skip("GRIZZLY_API_KEY is not set")
    with GrizzlySms(key) as sms:
        balance = sms.get_balance()
    assert isinstance(balance, (int, float))
