"""Live API tests for SV Number."""

import os

import pytest

from sv_number import SvNumber

api_key = os.environ.get("SV_NUMBER_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(
    not api_key,
    reason="SV_NUMBER_API_KEY environment variable not set",
)
def test_live_balance() -> None:
    with SvNumber(api_key) as client:
        balance = client.get_balance()
        assert isinstance(balance, float)
