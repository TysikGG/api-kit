"""Live API tests for SolveCaptcha client (skipped if SOLVECAPTCHA_API_KEY is unset)."""

import os

import pytest

from solvecaptcha import SolveCaptchaClient

API_KEY = os.environ.get("SOLVECAPTCHA_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="SOLVECAPTCHA_API_KEY not configured")
def test_live_balance() -> None:
    assert API_KEY is not None
    client = SolveCaptchaClient(api_key=API_KEY)

    balance = client.get_balance()
    assert isinstance(balance, (int, float))
