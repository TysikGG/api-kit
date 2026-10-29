"""Public XML rate file. No API key is required.

uv run python examples/rates.py
"""

from fixedfloat import FixedFloat


def main() -> None:
    with FixedFloat() as client:
        xml = client.get_rates_xml("float")
        print(f"Float XML bytes: {len(xml)}")
        pair = client.get_rates(order_type="float", from_ccy="BTC", to_ccy="ETH")
        for row in pair:
            print(f"{row.in_amount} {row.from_ccy} -> {row.out_amount} {row.to_ccy}")
            print(
                f"fee {row.to_fee} min {row.min_amount} max {row.max_amount} reserve {row.amount}"
            )
        fixed = client.get_rates(order_type="fixed", from_ccy="ETH", to_ccy="USDTTRC")
        print(f"Fixed ETH->USDTTRC rows: {len(fixed)}")


if __name__ == "__main__":
    main()
