"""Live API tests for VAK-SMS client (skipped if VAK_SMS_API_KEY is unset)."""

import os

import pytest

from vak_sms import VakSmsClient

API_KEY = os.environ.get("VAK_SMS_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not API_KEY, reason="VAK_SMS_API_KEY not configured")
def test_live_account_and_catalogs() -> None:
    assert API_KEY is not None
    client = VakSmsClient(api_key=API_KEY)

    balance = client.get_balance()
    assert isinstance(balance, (int, float))

    countries = client.get_country_list()
    assert isinstance(countries, list)
