"""Long-term rent API. createorder and prolong charge the account.

    GIVE_SMS_API_KEY=... uv run python examples/rent.py
"""

import os

from give_sms import GiveSms


def main() -> None:
    api_key = os.getenv("GIVE_SMS_API_KEY")
    if not api_key:
        print("Set GIVE_SMS_API_KEY. Listing countries does not rent a number.")
        return
    with GiveSms(api_key) as client:
        countries = client.rent_countries()
        print("Rent countries:", countries.get("count", len(countries)))
        kazakhstan = client.rent_get_data_country("KZ")
        print("Kazakhstan rent payload keys:", list(kazakhstan))
        print("Orders:", client.rent_all_orders().get("count"))
        if os.getenv("GIVE_SMS_ALLOW_PAID") != "1":
            print("Set GIVE_SMS_ALLOW_PAID=1 to rent. Rentals are not refundable.")
            return
        order = client.rent_create_order(
            type="week",
            period=1,
            services=[82],
            country="KZ",
            operator="ANY",
        )
        print("Rented", order.phone, "until", order.end_time)
        inbox = client.rent_wait_for_sms(order.order_id, timeout=30, interval=5)
        print([message.text for message in inbox.messages])


if __name__ == "__main__":
    main()
