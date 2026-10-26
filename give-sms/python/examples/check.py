import os

from give_sms import GiveSms


def main() -> None:
    api_key = os.getenv("GIVE_SMS_API_KEY", "demo_key")
    with GiveSms(api_key=api_key) as client:
        print("Checking Give-SMS balance...")
        try:
            balance = client.get_balance()
            print(f"Balance: {balance}")

            counts = client.get_count(country="kazakhstan")
            print(f"Available services: {len(counts)}")
        except Exception as exc:
            print(f"Error checking Give-SMS: {exc}")


if __name__ == "__main__":
    main()
