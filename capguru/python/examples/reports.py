"""Report a previous task. Does not create a captcha.

CAPGURU_API_KEY=... uv run python examples/reports.py good TASK_ID
"""

import os
import sys

from capguru import CapGuruClient


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    which = sys.argv[1] if len(sys.argv) > 1 else ""
    task_id = sys.argv[2] if len(sys.argv) > 2 else ""
    if not api_key or which not in {"good", "bad"} or not task_id:
        print("Usage: reports.py <good|bad> TASK_ID", file=sys.stderr)
        raise SystemExit(1)
    with CapGuruClient(api_key) as client:
        ok = client.report_good(task_id) if which == "good" else client.report_bad(task_id)
    print(ok)


if __name__ == "__main__":
    main()
