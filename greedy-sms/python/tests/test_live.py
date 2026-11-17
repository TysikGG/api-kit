"""Live API tests for Greedy SMS."""

import os

import pytest

from greedy_sms import GreedySMS

api_key = os.environ.get("GREEDY_SMS_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(
    not api_key,
    reason="GREEDY_SMS_API_KEY environment variable not set",
)
def test_live_health_profile_and_countries() -> None:
    """Check health, user profile, and country catalog without spending balance."""
    with GreedySMS(api_key=api_key) as client:
        health = client.check_health()
        assert health["status"] == "ok"

        me = client.get_me()
        assert isinstance(me["id"], str)
        assert isinstance(me["balance"], (int, float))
        assert me["balance"] >= 0.0

        countries = client.get_countries(page=1, page_size=5)
        assert isinstance(countries["countries"], list)
        assert len(countries["countries"]) > 0
