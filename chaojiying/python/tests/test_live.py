import os

import pytest

from chaojiying import Chaojiying

username = os.environ.get("CHAOJIYING_USER")
password = os.environ.get("CHAOJIYING_PASS")


@pytest.mark.live
@pytest.mark.skipif(not username or not password, reason="CHAOJIYING credentials not set")
def test_live_get_score():
    client = Chaojiying(username=username, password=password)
    score = client.get_score()
    assert score["err_no"] == 0
    assert isinstance(score["tifen"], int)
