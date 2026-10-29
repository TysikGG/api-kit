"""Spends balance. Solve one reCAPTCHA v2 and print the token.

    CAPMONSTER_API_KEY=... uv run python examples/solve_recaptcha_v2.py
"""

import os

from capmonster import CapMonster, recaptcha_v2


def main() -> None:
    client_key = os.environ.get("CAPMONSTER_API_KEY")
    if not client_key:
        raise SystemExit("Set CAPMONSTER_API_KEY")

    with CapMonster(client_key, retries=2) as client:
        solved = client.solve_detailed(
            recaptcha_v2(
                "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
                "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
            ),
            timeout=180,
        )
        print("taskId:", solved["taskId"])
        print(solved["solution"]["gRecaptchaResponse"])


if __name__ == "__main__":
    main()
