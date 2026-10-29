"""Cheap live check: reads the point balance and does not upload an image.

CHAOJIYING_USER=... CHAOJIYING_PASS=... python examples/quickstart.py
"""

import os
import sys

from chaojiying import Chaojiying


def main() -> None:
    username = os.environ.get("CHAOJIYING_USER")
    password = os.environ.get("CHAOJIYING_PASS")
    if not username or not password:
        print("Set CHAOJIYING_USER and CHAOJIYING_PASS.", file=sys.stderr)
        sys.exit(1)

    with Chaojiying(username=username, password=password) as client:
        score = client.get_score()
        print(f"Points (tifen): {score['tifen']}")
        print(f"Locked points (tifen_lock): {score['tifen_lock']}")


if __name__ == "__main__":
    main()
