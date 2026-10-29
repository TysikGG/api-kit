"""Build inbound partner replies, and push an SMS when GRIZZLY_PARTNER_KEY is set."""

import os

from grizzly_sms import (
    GrizzlyPartner,
    parse_partner_request,
    partner_finish_response,
    partner_number_response,
    partner_services_response,
)


def main() -> None:
    inbound = parse_partner_request(
        {
            "action": "GET_NUMBER",
            "key": "partner-key",
            "country": 0,
            "operator": "any",
            "service": "tg",
            "sum": 1,
        }
    )
    print(inbound["action"])
    print(partner_services_response([{"country": 0, "operatorMap": {"any": {"tg": 10}}}]))
    print(partner_number_response(number=79990001122, activationId=15))
    print(partner_finish_response())

    key = os.environ.get("GRIZZLY_PARTNER_KEY")
    if not key:
        print("Set GRIZZLY_PARTNER_KEY to send a live PUSH_SMS")
        return
    with GrizzlyPartner(key) as partner:
        status = partner.push_sms(
            sms_id=1,
            phone=447472190082,
            phone_from="Microsoft",
            text="code 5015",
        )
        print(status.status, status.error)


if __name__ == "__main__":
    main()
