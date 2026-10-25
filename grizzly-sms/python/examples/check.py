"""Read the balance and country list. Does not buy a number."""

import os

from grizzly_sms import GrizzlySms


def main() -> None:
    with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
        balance = sms.get_balance()
        countries = sms.get_countries()
        print(balance, len(countries))


if __name__ == "__main__":
    main()
