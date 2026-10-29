"""Free OCR v2. Does not spend 题分.

CHAOJIYING_API_KEY=... python examples/free_ocr.py image.jpg text
"""

import asyncio
import os
import sys

from chaojiying import AsyncChaojiying, FreeModel


async def main() -> None:
    if len(sys.argv) < 2 or not os.environ.get("CHAOJIYING_API_KEY"):
        print(
            "Usage: CHAOJIYING_API_KEY=... python examples/free_ocr.py <image> [text|calc|blocks]",
            file=sys.stderr,
        )
        sys.exit(1)
    model_arg = sys.argv[2] if len(sys.argv) > 2 else "text"
    model = {"calc": FreeModel.CALC, "blocks": FreeModel.BLOCKS}.get(model_arg, FreeModel.TEXT)
    async with AsyncChaojiying(api_key=os.environ["CHAOJIYING_API_KEY"]) as client:
        result = await client.recognize_free(open(sys.argv[1], "rb").read(), model)
        print(result.pic_str)
        if "rectangles" in result:
            print(result.rectangles)


if __name__ == "__main__":
    asyncio.run(main())
