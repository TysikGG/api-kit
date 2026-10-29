"""Click, grid, and slider helpers.

CAPGURU_API_KEY=... uv run python examples/clicks.py recaptcha ./image.png "traffic lights"
"""

import base64
import os
import sys
from pathlib import Path

from capguru import CLICK, CapGuruClient, scale_slider_offset, slider_offset


def _b64(path: str | None) -> str:
    if not path:
        print("Pass an image path", file=sys.stderr)
        raise SystemExit(1)
    return base64.b64encode(Path(path).read_bytes()).decode()


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    path = sys.argv[2] if len(sys.argv) > 2 else None
    hint = sys.argv[3] if len(sys.argv) > 3 else "slider"
    if not api_key:
        print("Set CAPGURU_API_KEY", file=sys.stderr)
        raise SystemExit(1)
    with CapGuruClient(api_key) as client:
        if command == "click":
            print(client.solve_click(hint, CLICK["OTHER"], body=_b64(path)))
        elif command == "recaptcha":
            print(client.solve_recaptcha_click(hint, _b64(path), grid=True))
        elif command == "hcaptcha":
            print(client.solve_hcaptcha_click(hint, _b64(path)))
        elif command == "funcaptcha":
            print(client.solve_funcaptcha_click(hint, _b64(path)))
        elif command == "geetest":
            print(client.solve_geetest_click(hint, _b64(path)))
        elif command == "slider":
            piece = _b64(sys.argv[3]) if len(sys.argv) > 3 else None
            solution = client.solve_slider(body=_b64(path), piece=piece)
            print(solution)
            offset = slider_offset(solution)
            if offset is not None:
                print("scaled", scale_slider_offset(offset, window_width=280))
        else:
            print("Usage: clicks.py <command> image [hint]", file=sys.stderr)
            raise SystemExit(1)


if __name__ == "__main__":
    main()
