"""Offline parser for a FixedFloat rates export. Does not call the network.

uv run python examples/parse_rates.py
"""

from fixedfloat import filter_rates, parse_rates_xml

XML = """<?xml version="1.0"?>
<rates>
  <item>
    <from>BTC</from>
    <to>ETH</to>
    <in>1</in>
    <out>17.72</out>
    <amount>191.1</amount>
    <tofee>0.0004 ETH</tofee>
    <minamount>0.001 BTC</minamount>
    <maxamount>2 BTC</maxamount>
  </item>
</rates>
"""


def main() -> None:
    rows = filter_rates(parse_rates_xml(XML), "BTC", "ETH")
    row = rows[0]
    print(f"{row.in_amount} {row.from_ccy} = {row.out_amount} {row.to_ccy}")
    print(f"min {row.min_amount}, max {row.max_amount}, fee {row.to_fee}")


if __name__ == "__main__":
    main()
