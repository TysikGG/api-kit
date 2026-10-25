import os
import sys

from chaojiying import Chaojiying


def main() -> None:
    username = os.environ.get("CHAOJIYING_USER")
    password = os.environ.get("CHAOJIYING_PASS")

    if not username or not password:
        print(
            "Please set CHAOJIYING_USER and CHAOJIYING_PASS environment variables.",
            file=sys.stderr,
        )
        sys.exit(1)

    with Chaojiying(username=username, password=password) as client:
        score = client.get_score()
        print(f"Points (tifen): {score['tifen']}")
        print(f"Locked Points (tifen_lock): {score['tifen_lock']}")


if __name__ == "__main__":
    main()
