import os

from capguru import CapGuruClient


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY", "demo_key")
    with CapGuruClient(api_key=api_key) as client:
        print("Checking CapGuru account balance...")
        try:
            balance = client.get_balance()
            print(f"Balance: {balance}")
        except Exception as exc:
            print(f"Error connecting to CapGuru: {exc}")


if __name__ == "__main__":
    main()
