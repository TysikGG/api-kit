"""Live API tests for NotLetters."""

import os

import pytest

from notletters import NotLetters

api_token = os.environ.get("NOTLETTERS_API_TOKEN")


@pytest.mark.live
@pytest.mark.skipif(
    not api_token,
    reason="NOTLETTERS_API_TOKEN environment variable not set",
)
def test_live_balance() -> None:
    """Check that user profile and balance can be read without spending money."""
    with NotLetters(api_token) as client:
        profile = client.get_me()
        assert isinstance(profile["id"], str)
        assert isinstance(profile["username"], str)
        assert isinstance(profile["balance"], (int, float))
        assert isinstance(profile["rate_limit"], int)

        balance = client.get_balance()
        assert isinstance(balance, (int, float))
        assert balance == profile["balance"]
