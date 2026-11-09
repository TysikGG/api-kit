import os
import sys

from steelproxy import SteelProxy


def main() -> None:
    api_key = os.environ.get("STEELPROXY_API_KEY")
    if not api_key:
        print("Please set STEELPROXY_API_KEY environment variable", file=sys.stderr)
        sys.exit(1)

    with SteelProxy(api_key) as client:
        # 1. Fetch available proxy categories
        proxy_types = client.get_proxy_types()
        print(f"Available proxy types ({len(proxy_types)}):")
        for t in proxy_types:
            print(f" - [{t['code']}] {t['title']}")

        # 2. Fetch available locations
        locations = client.get_locations()
        print(f"\nAvailable locations ({len(locations)}):")
        for loc in locations[:5]:
            print(
                f" - Node #{loc['node_id']}: {loc['title']} ({loc['country_code']}) "
                f"[{loc['proxy_type']}], terms: {loc['terms_days']} days"
            )

        # 3. Fetch summary of existing orders (read-only, does not spend balance)
        orders = client.get_orders(page=1, page_size=5)
        print(f"\nTotal orders on account: {orders['total']}")


if __name__ == "__main__":
    main()
