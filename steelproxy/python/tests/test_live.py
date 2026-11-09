"""Live API tests for Steel Proxy."""

import os

import pytest

from steelproxy import SteelProxy

api_key = os.environ.get("STEELPROXY_API_KEY")


@pytest.mark.live
@pytest.mark.skipif(
    not api_key,
    reason="STEELPROXY_API_KEY environment variable not set",
)
def test_live_catalog_and_orders() -> None:
    """Check that proxy catalog and orders can be retrieved without spending money."""
    with SteelProxy(api_key) as client:
        types = client.get_proxy_types()
        assert isinstance(types, list)
        assert len(types) > 0

        locations = client.get_locations()
        assert isinstance(locations, list)

        terms = client.get_terms()
        assert isinstance(terms, list)

        orders = client.get_orders(page=1, page_size=5)
        assert isinstance(orders["total"], int)
        assert isinstance(orders["items"], list)
