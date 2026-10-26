import os

from sms_man import SmsMan


def main() -> None:
    token = os.getenv("SMSMAN_API_KEY", "demo_token")
    with SmsMan(token=token) as client:
        print("Checking SMS-MAN account balance...")
        try:
            balance = client.get_balance()
            print(f"Balance: {balance}")

            countries = client.get_countries()
            print("Countries received:", bool(countries))
        except Exception as exc:
            print(f"Error connecting to SMS-MAN: {exc}")


if __name__ == "__main__":
    main()
