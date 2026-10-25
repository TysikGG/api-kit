"""Live API tests for Peak."""

import os

import pytest

from peak import Peak

api_key = os.environ.get("PEAK_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="PEAK_API_KEY environment variable not set")
def test_live_balance() -> None:
    with Peak(api_key) as client:
        balance = client.get_balance()
        assert balance is not None
        assert "type" in balance
