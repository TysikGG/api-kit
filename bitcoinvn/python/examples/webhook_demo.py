"""Offline webhook check. Does not call the network."""

import json
import os

from bitcoinvn import read_webhook, webhook_signature

ORDER = {
    "id": "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
    "shortId": "BV2MTZAF",
    "status": "completed",
}


def main() -> None:
    api_key = os.environ.get("BITCOINVN_API_KEY", "example-key")
    body = json.dumps(ORDER)
    signature = webhook_signature(body, api_key)
    order, verified = read_webhook(body, signature, api_key, require_signature=True)
    print(verified, order["shortId"], order["status"])


if __name__ == "__main__":
    main()
