"""Parse a profile webhook body. No network."""

from grizzly_sms import parse_activation_webhook


def main() -> None:
    event = parse_activation_webhook(
        {
            "activationId": 15,
            "service": "tg",
            "text": "code 5015",
            "code": "5015",
            "country": "16",
            "receivedAt": "2026-01-01 00:00:00",
        }
    )
    print(event.activation_id, event.code, event.service)


if __name__ == "__main__":
    main()
