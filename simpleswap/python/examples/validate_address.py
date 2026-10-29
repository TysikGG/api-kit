import os

from simpleswap import SimpleSwap


def main() -> None:
    with SimpleSwap() as client:
        pattern = "^(0x)[0-9A-Fa-f]{40}$"
        sample = "0x" + "ab" * 20
        print(f"Local ETH check: {client.is_valid_address(sample, pattern)}")
        print(f"Empty address: {client.is_valid_address('  ', pattern)}")

    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to validate against the live currency pattern.")
        return

    address = os.environ.get("SIMPLESWAP_ADDRESS_TO", "1BoatSLRHtKNngkdXEeobR76b53LETtpyT")
    with SimpleSwap(api_key=api_key) as client:
        btc = client.get_currency("btc", "btc")
        print(f"{address} matches btc: {client.is_valid_address(address, currency=btc)}")


if __name__ == "__main__":
    main()
