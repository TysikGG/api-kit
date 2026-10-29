"""Image and text solvers.

CAPGURU_API_KEY=... uv run python examples/images.py image ./captcha.png
CAPGURU_API_KEY=... uv run python examples/images.py text "What is 2 + 2?"
"""

import base64
import os
import sys
from pathlib import Path

from capguru import VERNET, CapGuruClient


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if not api_key:
        print("Set CAPGURU_API_KEY", file=sys.stderr)
        raise SystemExit(1)
    with CapGuruClient(api_key) as client:
        if command in {"image", "file"}:
            if len(sys.argv) < 3:
                print("Pass an image path", file=sys.stderr)
                raise SystemExit(1)
            raw = Path(sys.argv[2]).read_bytes()
            if command == "image":
                body = base64.b64encode(raw).decode()
                print(client.solve_image(body, vernet=VERNET["GENERAL_V2"]))
            else:
                answer = client.solve_image_file(
                    raw, filename="captcha.png", vernet=VERNET["GENERAL_V2"]
                )
                print(answer)
            return
        if command == "text":
            question = " ".join(sys.argv[2:]) or "What is 2 + 2?"
            print(client.solve_text(question, language=2))
            return
    print("Usage: images.py <image|file> path | images.py text question", file=sys.stderr)
    raise SystemExit(1)


if __name__ == "__main__":
    main()
