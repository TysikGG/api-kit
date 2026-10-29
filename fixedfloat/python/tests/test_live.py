"""Read-only live checks. Skipped unless API credentials are set. Never creates an order."""

import os

import pytest

from fixedfloat import FixedFloat

pytestmark = pytest.mark.live

KEY = os.getenv("FIXEDFLOAT_API_KEY")
SECRET = os.getenv("FIXEDFLOAT_API_SECRET")


@pytest.mark.skipif(
    not KEY or not SECRET, reason="FIXEDFLOAT_API_KEY and FIXEDFLOAT_API_SECRET are required"
)
def test_live_currencies_price_and_rates() -> None:
    with FixedFloat(api_key=KEY, api_secret=SECRET, retries=1) as client:
        currencies = client.get_currencies()
        assert currencies
        assert any(item.code == "BTC" for item in currencies)

        price = client.get_price("BTC", "ETH", 0.01, direction="from", order_type="float")
        assert price.from_side.amount
        assert price.to_side.amount

        rates = client.get_rates(order_type="float", from_ccy="BTC", to_ccy="ETH")
        assert rates
        assert rates[0].from_ccy.upper() == "BTC"
