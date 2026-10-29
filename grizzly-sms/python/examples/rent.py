"""Rent a number for 4 hours, print messages, and finish the rental.

This spends balance.
"""

import os

from grizzly_sms import GrizzlySms, RentAction


def main() -> None:
    with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
        prices = sms.get_rent_prices(service="tg", country=0, rent_time=4)
        print(prices[0] if prices else None)
        rented = sms.get_rent_number("tg", 0, 4)
        print(rented.id, rented.number, rented.end_date)
        status = sms.get_rent_status(rented.id)
        for message in status.messages:
            print(message.phone_from, message.text)
        history = sms.get_rent_history(rented.id)
        print(history.quantity, len(history.entries))
        print(sms.set_rent_status(rented.id, RentAction.FINISH))


if __name__ == "__main__":
    main()
