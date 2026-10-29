"""Balance check through an optional HTTP proxy.

python examples/proxy_and_retries.py http://127.0.0.1:8888
"""

import os
import sys

from chaojiying import Chaojiying


def main() -> None:
    if not os.environ.get("CHAOJIYING_USER") or not os.environ.get("CHAOJIYING_PASS"):
        print("Set CHAOJIYING_USER and CHAOJIYING_PASS. Optional arg: proxy URL.", file=sys.stderr)
        sys.exit(1)
    proxy = sys.argv[1] if len(sys.argv) > 1 else None
    with Chaojiying(proxy=proxy, retries=2, retry_delay=0.4, timeout=60, user_agent="chaojiying-example") as client:
        print(dict(client.get_score()))


if __name__ == "__main__":
    main()
