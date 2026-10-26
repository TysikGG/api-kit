"""Live API tests for SMSBower client (skipped if SMSBOWER_API_KEY is unset)."""

import os

import pytest

from smsbower import SmsBowerClient

API_KEY = os.environ.get("SMSBOWER_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="SMSBOWER_API_KEY not configured")
def test_live_account_and_catalogs() -> None:
    assert API_KEY is not None
    client = SmsBowerClient(api_key=API_KEY)

    balance = client.get_balance()
    assert isinstance(balance, (int, float))

    services = client.get_services_list()
    assert isinstance(services, list)
    assert len(services) > 0

    countries = client.get_countries()
    assert isinstance(countries, dict)
    assert len(countries) > 0
