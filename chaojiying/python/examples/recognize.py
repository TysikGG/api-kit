"""Paid recognition.

python examples/recognize.py captcha.jpg 1004
python examples/recognize.py click.png 9801 查,找
python examples/recognize.py mixed.png 6900 red
"""

import os
import sys

from chaojiying import Chaojiying, CodeType, click_instruction, color_instruction


def main() -> None:
    if len(sys.argv) < 3 or not os.environ.get("CHAOJIYING_USER"):
        print(
            "Usage: CHAOJIYING_USER=... CHAOJIYING_PASS=... "
            "python examples/recognize.py <image> <codetype> [extra]",
            file=sys.stderr,
        )
        sys.exit(1)
    file_path, type_arg = sys.argv[1], sys.argv[2]
    extra = sys.argv[3] if len(sys.argv) > 3 else None
    code_type = getattr(CodeType, type_arg, None)
    if code_type is None:
        code_type = int(type_arg)
    str_debug = None
    if code_type == CodeType.LOCATE_CHARS and extra:
        str_debug = click_instruction(extra.split(","))
    elif code_type == CodeType.MIXED_COLOR and extra:
        str_debug = color_instruction(extra)
    elif extra:
        str_debug = extra

    with Chaojiying() as client:
        result = client.recognize(open(file_path, "rb").read(), code_type, str_debug, len_min=0)
        print(dict(result))


if __name__ == "__main__":
    main()
