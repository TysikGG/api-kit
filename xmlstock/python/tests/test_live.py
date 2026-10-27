import os

import pytest

from xmlstock import XmlStockClient

user = os.getenv("XMLSTOCK_USER")
api_key = os.getenv("XMLSTOCK_KEY")


@pytest.mark.live
@pytest.mark.skipif(not (user and api_key), reason="XMLSTOCK_USER or XMLSTOCK_KEY is not set")
def test_live_get_balance() -> None:
    with XmlStockClient(user=user, api_key=api_key) as client:
        balance = client.get_balance()
        assert balance is not None
