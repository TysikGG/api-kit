import os

from twocaptcha import TwoCaptchaClient


def main() -> None:
    api_key = os.getenv("TWOCAPTCHA_API_KEY", "demo_key")
    with TwoCaptchaClient(api_key=api_key) as client:
        print("Checking 2Captcha account balance...")
        try:
            balance = client.get_balance()
            print(f"Balance: ${balance}")
        except Exception as exc:
            print(f"Error connecting to 2Captcha: {exc}")


if __name__ == "__main__":
    main()
