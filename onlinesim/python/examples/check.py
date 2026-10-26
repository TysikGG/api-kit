import os

from onlinesim import OnlineSim


def main() -> None:
    api_key = os.getenv("ONLINESIM_API_KEY", "demo_key")
    with OnlineSim(api_key=api_key) as client:
        print("Checking OnlineSIM balance...")
        try:
            balance = client.get_balance()
            print(f"Balance: {balance}")

            countries = client.get_countries()
            print("Supported countries response received:", bool(countries))
        except Exception as exc:
            print(f"Error connecting to OnlineSIM: {exc}")


if __name__ == "__main__":
    main()
