import os

import pytest

from exolix import Exolix

api_key = os.environ.get("EXOLIX_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="EXOLIX_API_KEY not set")
def test_live_currencies() -> None:
    with Exolix(api_key=api_key) as client:
        page = client.get_currencies(page=1, size=5, with_networks=True)
        assert isinstance(page["data"], list)
        assert len(page["data"]) > 0
        assert page["count"] > 0
        assert "code" in page["data"][0]
        assert "name" in page["data"][0]


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="EXOLIX_API_KEY not set")
def test_live_networks() -> None:
    with Exolix(api_key=api_key) as client:
        networks = client.get_currency_networks("ETH")
        assert isinstance(networks, list)
        assert len(networks) > 0
        assert "network" in networks[0]

        catalog = client.get_networks(page=1, size=5)
        assert isinstance(catalog["data"], list)
        assert len(catalog["data"]) > 0
        assert catalog["count"] > 0


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="EXOLIX_API_KEY not set")
def test_live_rate_float_amount() -> None:
    with Exolix(api_key=api_key) as client:
        quote = client.get_rate(
            "BTC",
            "ETH",
            "float",
            network_from="BTC",
            network_to="ETH",
            amount="0.1",
        )
        assert float(quote["toAmount"]) > 0
        assert float(quote["rate"]) > 0
        assert float(quote["minAmount"]) > 0


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="EXOLIX_API_KEY not set")
def test_live_rate_fixed_withdrawal_amount() -> None:
    with Exolix(api_key=api_key) as client:
        quote = client.get_rate(
            "ETH",
            "USDT",
            "fixed",
            network_from="ETH",
            network_to="ETH",
            withdrawal_amount="50",
        )
        assert float(quote["fromAmount"]) > 0
        assert float(quote["toAmount"]) > 0


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="EXOLIX_API_KEY not set")
def test_live_transaction_history() -> None:
    with Exolix(api_key=api_key) as client:
        history = client.get_transactions(page=1, size=5, order="desc")
        assert isinstance(history["data"], list)
        assert isinstance(history["count"], int)
