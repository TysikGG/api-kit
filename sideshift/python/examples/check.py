from sideshift import SideShift


def main() -> None:
    with SideShift() as client:
        print("Checking SideShift.ai API connection...")
        try:
            permissions = client.get_permissions()
            print(f"Shift creation permitted: {permissions.create_shift}")

            pair = client.get_pair("eth", "ethereum", "btc", "bitcoin")
            print(f"ETH-BTC Rate: {pair.rate} (Min: {pair.min}, Max: {pair.max})")
        except Exception as exc:
            print(f"Error connecting to SideShift: {exc}")


if __name__ == "__main__":
    main()
