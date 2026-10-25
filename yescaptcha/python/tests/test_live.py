"""Live API tests for YesCaptcha."""

import os

import pytest

from yescaptcha import YesCaptcha

client_key = os.environ.get("YESCAPTCHA_CLIENT_KEY")


@pytest.mark.live
@pytest.mark.skipif(
    not client_key,
    reason="YESCAPTCHA_CLIENT_KEY environment variable not set",
)
def test_live_balance() -> None:
    with YesCaptcha(client_key) as client:
        balance = client.get_balance()
        assert balance is not None
        assert "balance" in balance
