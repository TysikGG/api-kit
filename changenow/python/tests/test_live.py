import os

import pytest

from changenow import ChangeNow

api_key = os.environ.get("CHANGENOW_API_KEY")
ETH_ADDRESS = "0x57f31ad4b64095347F87eDB1675566DAfF5EC886"


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="CHANGENOW_API_KEY not set")
def test_live_currencies() -> None:
    with ChangeNow(api_key=api_key) as client:
        currencies = client.get_currencies(active=True, flow="standard")
        assert isinstance(currencies, list)
        assert len(currencies) > 0
        assert "ticker" in currencies[0]
        assert "network" in currencies[0]


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="CHANGENOW_API_KEY not set")
def test_live_min_amount() -> None:
    with ChangeNow(api_key=api_key) as client:
        minimum = client.get_min_amount("btc", "eth", "btc", "eth", flow="standard")
        assert float(minimum["minAmount"]) > 0


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="CHANGENOW_API_KEY not set")
def test_live_estimate() -> None:
    with ChangeNow(api_key=api_key) as client:
        estimate = client.get_estimated_amount(
            "btc",
            "eth",
            from_amount="0.1",
            from_network="btc",
            to_network="eth",
            flow="standard",
            type="direct",
        )
        assert float(estimate["toAmount"]) > 0
        assert estimate["flow"] == "standard"


@pytest.mark.live
@pytest.mark.skipif(not api_key, reason="CHANGENOW_API_KEY not set")
def test_live_validate_address() -> None:
    with ChangeNow(api_key=api_key) as client:
        check = client.validate_address("eth", ETH_ADDRESS)
        assert check["result"] is True
