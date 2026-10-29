"""Result parsers, instruction builders, and response MD5 verification."""

from __future__ import annotations

import hashlib
import re

from .errors import ChaojiyingError

MAX_PAID_IMAGE_BYTES = 1024 * 1024
MAX_FREE_IMAGE_BYTES = 2 * 1024 * 1024

_BASE64_RE = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")
_DATA_URI_RE = re.compile(r"^data:image/[a-z0-9.+-]+;base64,", re.IGNORECASE)
_TEXT_LOC_RE = re.compile(r"^(.*),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$")
_UNICODE_RE = re.compile(r"\\u([0-9a-fA-F]{4})")


class ColorChannel:
    """Index order required by the 6900 ``8f`` instruction."""

    RED = 0
    GREEN = 1
    BLUE = 2
    YELLOW = 3
    WHITE = 4
    BLACK = 5


_COLOR_NAMES = {
    "red": 0,
    "green": 1,
    "blue": 2,
    "yellow": 3,
    "white": 4,
    "black": 5,
    "红": 0,
    "绿": 1,
    "蓝": 2,
    "黄": 3,
    "白": 4,
    "黑": 5,
}


def color_instruction(color: int | str, tolerance: int = 100, background: int = 255) -> str:
    """Build ``{8f:index,tolerance,background/8f}`` for codetype 6900.

    Each call costs 8 extra points. Leave ``background`` at 255 unless the
    image background is not white.
    """
    index = _resolve_color(color)
    if not isinstance(tolerance, int) or isinstance(tolerance, bool) or not 0 <= tolerance <= 255:
        raise ChaojiyingError("Color tolerance must be an integer from 0 to 255.")
    if not isinstance(background, int) or isinstance(background, bool) or not 0 <= background <= 255:
        raise ChaojiyingError("Color background must be an integer from 0 to 255.")
    return f"{{8f:{index},{tolerance},{background}/8f}}"


def _resolve_color(color: int | str) -> int:
    if isinstance(color, bool) or (isinstance(color, int) and not 0 <= color <= 5):
        raise ChaojiyingError("Color channel must be an integer from 0 to 5.")
    if isinstance(color, int):
        return color
    named = _COLOR_NAMES.get(color.strip().lower(), _COLOR_NAMES.get(color.strip()))
    if named is None:
        raise ChaojiyingError(
            f'Unknown color "{color}". Use 0-5 or red/green/blue/yellow/white/black.'
        )
    return named


def click_instruction(chars: list[str] | tuple[str, ...]) -> str:
    """Build ``{8a:字,符/8a}`` for codetype 9801. Order is preserved."""
    if not chars:
        raise ChaojiyingError("click_instruction requires at least one character.")
    if any(not char or re.search(r"[,{}/]", char) for char in chars):
        raise ChaojiyingError("Click characters cannot be empty or contain , { } /.")
    return "{8a:" + ",".join(chars) + "/8a}"


def horizontal_distance(a: dict[str, float], b: dict[str, float]) -> float:
    """Absolute horizontal distance. Used for codetype 9602."""
    return abs(float(a["x"]) - float(b["x"]))


def compute_response_md5(soft_id: str, soft_key: str, pic_id: str, pic_str: str) -> str:
    """md5(softid + softkey + pic_id + pic_str), 32 lowercase hex."""
    raw = f"{soft_id}{soft_key}{pic_id}{pic_str}".encode()
    return hashlib.md5(raw).hexdigest()


def verify_response_md5(
    result: dict[str, str],
    soft_id: str,
    soft_key: str,
) -> bool:
    digest = result.get("md5") or ""
    if not digest:
        return False
    expected = compute_response_md5(soft_id, soft_key, result.get("pic_id", ""), result.get("pic_str", ""))
    return expected == digest.lower()


def _segments(pic_str: str) -> list[str]:
    trimmed = pic_str.strip()
    if not trimmed:
        return []
    return [part.strip() for part in trimmed.split("|") if part.strip()]


def _decode_unicode(text: str) -> str:
    return _UNICODE_RE.sub(lambda match: chr(int(match.group(1), 16)), text)


def _finite(value: str, label: str) -> float:
    try:
        parsed = float(value)
    except ValueError as exc:
        raise ChaojiyingError(f'Invalid {label} in "{value}".') from exc
    return parsed


def parse_points(pic_str: str) -> list[dict[str, float]]:
    """Parse ``x,y|x,y`` click and center-point results."""
    points: list[dict[str, float]] = []
    for part in _segments(pic_str):
        bits = part.split(",")
        if len(bits) != 2:
            raise ChaojiyingError(f'Invalid point "{part}". Expected x,y.')
        points.append({"x": _finite(bits[0], "x"), "y": _finite(bits[1], "y")})
    return points


def parse_rectangles(pic_str: str) -> list[dict[str, float]]:
    """Parse ``x1,y1,x2,y2`` rectangles from codetype 9900 and free OCR model 9."""
    rects: list[dict[str, float]] = []
    for part in _segments(pic_str):
        bits = part.split(",")
        if len(bits) != 4:
            raise ChaojiyingError(f'Invalid rectangle "{part}". Expected x1,y1,x2,y2.')
        rects.append(
            {
                "x1": _finite(bits[0], "x1"),
                "y1": _finite(bits[1], "y1"),
                "x2": _finite(bits[2], "x2"),
                "y2": _finite(bits[3], "y2"),
            }
        )
    return rects


def parse_text_locations(pic_str: str) -> list[dict[str, float | str]]:
    """Parse ``text,x,y`` rows from codetype 9800."""
    rows: list[dict[str, float | str]] = []
    for part in _segments(pic_str):
        match = _TEXT_LOC_RE.match(part)
        if not match:
            raise ChaojiyingError(f'Invalid text location "{part}". Expected text,x,y.')
        rows.append(
            {
                "text": _decode_unicode(match.group(1)),
                "x": _finite(match.group(2), "x"),
                "y": _finite(match.group(3), "y"),
            }
        )
    return rows


def parse_plates(pic_str: str) -> list[dict[str, float | str]]:
    """Parse ``number,confidence,color,x1,y1,x2,y2`` rows from codetype 8601."""
    plates: list[dict[str, float | str]] = []
    for part in _segments(pic_str):
        bits = part.split(",")
        if len(bits) < 7:
            raise ChaojiyingError(f'Invalid plate "{part}".')
        y2 = _finite(bits[-1], "y2")
        x2 = _finite(bits[-2], "x2")
        y1 = _finite(bits[-3], "y1")
        x1 = _finite(bits[-4], "x1")
        color = bits[-5]
        confidence = _finite(bits[-6], "confidence")
        number = _decode_unicode(",".join(bits[:-6]))
        plates.append(
            {
                "number": number,
                "confidence": confidence,
                "color": color,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
            }
        )
    return plates
