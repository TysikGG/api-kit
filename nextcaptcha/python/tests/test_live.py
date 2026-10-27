"""Live API tests for NextCaptcha.

Skipped unless NEXTCAPTCHA_API_KEY is set. The suite only calls getBalance,
so it does not submit a paid solve.
"""

import os

import pytest

from nextcaptcha import NextCaptcha, NextCaptchaError

API_KEY = os.environ.get("NEXTCAPTCHA_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="NEXTCAPTCHA_API_KEY not configured")
def test_live_balance() -> None:
    assert API_KEY is not None
    with NextCaptcha(API_KEY) as client:
        balance = client.get_balance()
        assert isinstance(balance["balance"], (int, float))


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="NEXTCAPTCHA_API_KEY not configured")
def test_live_invalid_key() -> None:
    with NextCaptcha("invalid_key_000") as client:
        with pytest.raises(NextCaptchaError) as exc_info:
            client.get_balance()
        assert exc_info.value.error_code == "ERROR_KEY_DOES_NOT_EXIST"
