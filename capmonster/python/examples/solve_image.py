"""Spends balance. Recognize a base64 image.

    CAPMONSTER_API_KEY=... CAPTCHA_BODY=... uv run python examples/solve_image.py
"""

import os

from capmonster import CapMonster, image_to_text


def main() -> None:
    client_key = os.environ.get("CAPMONSTER_API_KEY")
    if not client_key:
        raise SystemExit("Set CAPMONSTER_API_KEY")

    with CapMonster(client_key) as client:
        solution = client.solve(
            image_to_text(
                os.environ.get("CAPTCHA_BODY", "BASE64_BODY_HERE"),
                capMonsterModule="universal",
                recognizingThreshold=70,
                case=True,
                numeric=0,
                math=False,
            )
        )
        print(solution["text"])


if __name__ == "__main__":
    main()
