"""Spends balance. Report the token when REPORT=1.

    CAPMONSTER_API_KEY=... REPORT=1 uv run python examples/report_incorrect.py
"""

import os

from capmonster import CapMonster, recaptcha_v2


def main() -> None:
    client_key = os.environ.get("CAPMONSTER_API_KEY")
    if not client_key:
        raise SystemExit("Set CAPMONSTER_API_KEY")

    with CapMonster(client_key) as client:
        solved = client.solve_detailed(
            recaptcha_v2(
                "https://lessons.zennolab.com/captchas/recaptcha/v2_simple.php?level=high",
                "6Lcg7CMUAAAAANphynKgn9YAgA4tQ2KI_iqRyTwd",
                nocache=True,
            )
        )
        print(solved["taskId"], solved["solution"]["gRecaptchaResponse"])
        if os.environ.get("REPORT") == "1":
            print(client.report_incorrect_token(solved["taskId"]))


if __name__ == "__main__":
    main()
