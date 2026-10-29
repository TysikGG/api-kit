"""Live API tests for CapMonster Cloud.

Skipped unless CAPMONSTER_API_KEY is set. The zero-balance createTask check
submits a task only when the account balance is exactly 0, so a funded key
is not charged.
"""

import os

import pytest

from capmonster import CapMonster, CapMonsterError, recaptcha_v2

API_KEY = os.environ.get("CAPMONSTER_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="CAPMONSTER_API_KEY not configured")
def test_live_user_agent() -> None:
    assert API_KEY is not None
    with CapMonster(API_KEY) as client:
        user_agent = client.get_user_agent()
        assert "Mozilla" in user_agent


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="CAPMONSTER_API_KEY not configured")
def test_live_balance() -> None:
    assert API_KEY is not None
    with CapMonster(API_KEY) as client:
        balance = client.get_balance()
        assert isinstance(balance["balance"], (int, float))


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="CAPMONSTER_API_KEY not configured")
def test_live_invalid_key() -> None:
    with CapMonster("invalid_key_000") as client:
        with pytest.raises(CapMonsterError) as exc_info:
            client.get_balance()
        assert exc_info.value.error_code == "ERROR_KEY_DOES_NOT_EXIST"


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="CAPMONSTER_API_KEY not configured")
def test_live_zero_balance_create_task() -> None:
    assert API_KEY is not None
    with CapMonster(API_KEY) as client:
        balance = client.get_balance()["balance"]
        if balance != 0:
            pytest.skip(
                f"Account balance is {balance}; skipping createTask so a funded key is not charged"
            )

        with pytest.raises(CapMonsterError) as exc_info:
            client.create_task(
                recaptcha_v2(
                    "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
                    "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
                )
            )
        assert exc_info.value.error_code == "ERROR_ZERO_BALANCE"
