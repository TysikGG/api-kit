"""Site-specific click presets.

CAPGURU_API_KEY=... uv run python examples/sites.py binance ./image.png dog
"""

import base64
import os
import sys
from pathlib import Path

from capguru import CapGuruClient


def _b64(path: str | None) -> str:
    if not path:
        print("Pass an image path", file=sys.stderr)
        raise SystemExit(1)
    return base64.b64encode(Path(path).read_bytes()).decode()


def main() -> None:
    api_key = os.getenv("CAPGURU_API_KEY")
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    path = sys.argv[2] if len(sys.argv) > 2 else None
    extra = sys.argv[3] if len(sys.argv) > 3 else None
    if not api_key:
        print("Set CAPGURU_API_KEY", file=sys.stderr)
        raise SystemExit(1)
    body = _b64(path)
    with CapGuruClient(api_key) as client:
        if command == "binance":
            print(client.solve_binance(body, object_name=extra or "dog"))
        elif command == "tiktok":
            print(client.solve_tiktok(variant="slider", body=body))
        elif command == "aws":
            instruction = extra or "Place a dot at the end of the car's path"
            print(client.solve_aws(body, instruction=instruction))
        elif command == "temu":
            print(client.solve_temu(extra or "Select the matching object", body=body))
        elif command == "bitget":
            print(client.solve_bitget(body=body))
        elif command == "linkvertise":
            print(client.solve_linkvertise(extra or "click the matching icon", body=body))
        elif command == "seofast":
            print(client.solve_seofast(extra or "click the matching icon", body=body))
        elif command == "worldcash":
            print(client.solve_worldcash(body=body))
        else:
            print("Usage: sites.py <command> image [hint]", file=sys.stderr)
            raise SystemExit(1)


if __name__ == "__main__":
    main()
