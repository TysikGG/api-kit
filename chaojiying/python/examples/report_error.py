"""Refund one pic_id. Only when the answer is wrong, within about three minutes.

python examples/report_error.py 9160109360600112681
"""

import os
import sys

from chaojiying import Chaojiying


def main() -> None:
    if len(sys.argv) != 2 or not os.environ.get("CHAOJIYING_USER"):
        print(
            "Usage: CHAOJIYING_USER=... CHAOJIYING_PASS=... python examples/report_error.py <pic_id>",
            file=sys.stderr,
        )
        sys.exit(1)
    with Chaojiying() as client:
        print(dict(client.report_error(sys.argv[1])))


if __name__ == "__main__":
    main()
