"""Live API tests for HeroSMS."""

import os

import pytest

from hero_sms import HeroSMS

api_key = os.environ.get("HERO_SMS_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(
    not api_key,
    reason="HERO_SMS_API_KEY environment variable not set",
)
def test_live_balance_and_countries() -> None:
    """Check that balance and countries catalog can be retrieved safely without spending money."""
    with HeroSMS(api_key=api_key) as client:
        balance = client.get_balance()
        assert isinstance(balance, float)
        assert balance >= 0.0

        countries = client.get_countries()
        assert isinstance(countries, dict)
        assert len(countries) > 0
