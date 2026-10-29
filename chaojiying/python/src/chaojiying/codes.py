"""Public Chaojiying code types from the price table and type guides."""

from __future__ import annotations

from typing import Literal, TypedDict

ResultShape = Literal["text", "points", "rectangles", "text-locations", "plates"]


class CodeTypeInfo(TypedDict):
    id: int
    name: str
    description: str
    shape: ResultShape
    price: str


class CodeType:
    """Numeric ``codetype`` values accepted by Processing.php."""

    ALNUM_4_TO_6 = 1902
    ALNUM_1_TO_4 = 1004
    ALNUM_1_TO_5 = 1005
    ALNUM_1_TO_6 = 1006
    ALNUM_1_TO_7 = 1007
    ALNUM_1_TO_8 = 1008
    ALNUM_1_TO_9 = 1009
    ALNUM_1_TO_10 = 1010
    ALNUM_1_TO_12 = 1012
    ALNUM_1_TO_20 = 1020
    HAN_1 = 2001
    HAN_1_TO_2 = 2002
    HAN_1_TO_3 = 2003
    HAN_1_TO_4 = 2004
    HAN_1_TO_5 = 2005
    HAN_1_TO_6 = 2006
    HAN_1_TO_7 = 2007
    ENGLISH_1_TO_4 = 3004
    ENGLISH_1_TO_5 = 3005
    ENGLISH_1_TO_6 = 3006
    ENGLISH_1_TO_7 = 3007
    ENGLISH_1_TO_8 = 3008
    ENGLISH_1_TO_12 = 3012
    DIGITS_1_TO_4 = 4004
    DIGITS_1_TO_5 = 4005
    DIGITS_1_TO_6 = 4006
    DIGITS_1_TO_7 = 4007
    DIGITS_1_TO_8 = 4008
    MIXED_VARIABLE = 5000
    ALNUM_SYMBOLS_8 = 5108
    PINYIN_CALC_IDIOM = 5201
    CALCULATION = 6001
    QUESTION = 6004
    MIXED_COLOR = 6900
    HORIZONTAL_PUZZLE = 9602
    LOCATE_CHARS = 9801
    LOCATE_ALL_TEXT = 9800
    ONE_BLOCK_CENTER = 9901
    TWO_BLOCK_CENTERS = 9902
    BLOCKS = 9900
    CLICK_1 = 9101
    CLICK_2 = 9102
    CLICK_3 = 9103
    CLICK_4 = 9104
    CLICK_1_TO_4 = 9004
    CLICK_1_TO_5 = 9005
    CLICK_1_TO_6 = 9006
    CLICK_1_TO_8 = 9008
    CLICK_1_TO_9 = 9009
    LICENSE_PLATE = 8601


CODE_TYPES: list[CodeTypeInfo] = [
    {"id": 1902, "name": "ALNUM_4_TO_6", "description": "4–6 English letters or digits", "shape": "text", "price": "10/12/15"},
    {"id": 1004, "name": "ALNUM_1_TO_4", "description": "1–4 English letters or digits", "shape": "text", "price": "10"},
    {"id": 1005, "name": "ALNUM_1_TO_5", "description": "1–5 English letters or digits", "shape": "text", "price": "12"},
    {"id": 1006, "name": "ALNUM_1_TO_6", "description": "1–6 English letters or digits", "shape": "text", "price": "15"},
    {"id": 1007, "name": "ALNUM_1_TO_7", "description": "1–7 English letters or digits", "shape": "text", "price": "17.5"},
    {"id": 1008, "name": "ALNUM_1_TO_8", "description": "1–8 English letters or digits", "shape": "text", "price": "20"},
    {"id": 1009, "name": "ALNUM_1_TO_9", "description": "1–9 English letters or digits", "shape": "text", "price": "22.5"},
    {"id": 1010, "name": "ALNUM_1_TO_10", "description": "1–10 English letters or digits", "shape": "text", "price": "25"},
    {"id": 1012, "name": "ALNUM_1_TO_12", "description": "1–12 English letters or digits", "shape": "text", "price": "30"},
    {"id": 1020, "name": "ALNUM_1_TO_20", "description": "1–20 English letters or digits", "shape": "text", "price": "50"},
    {"id": 2001, "name": "HAN_1", "description": "1 Chinese character", "shape": "text", "price": "10"},
    {"id": 2002, "name": "HAN_1_TO_2", "description": "1–2 Chinese characters", "shape": "text", "price": "20"},
    {"id": 2003, "name": "HAN_1_TO_3", "description": "1–3 Chinese characters", "shape": "text", "price": "30"},
    {"id": 2004, "name": "HAN_1_TO_4", "description": "1–4 Chinese characters", "shape": "text", "price": "40"},
    {"id": 2005, "name": "HAN_1_TO_5", "description": "1–5 Chinese characters", "shape": "text", "price": "50"},
    {"id": 2006, "name": "HAN_1_TO_6", "description": "1–6 Chinese characters", "shape": "text", "price": "60"},
    {"id": 2007, "name": "HAN_1_TO_7", "description": "1–7 Chinese characters", "shape": "text", "price": "70"},
    {"id": 3004, "name": "ENGLISH_1_TO_4", "description": "1–4 English letters", "shape": "text", "price": "10"},
    {"id": 3005, "name": "ENGLISH_1_TO_5", "description": "1–5 English letters", "shape": "text", "price": "12"},
    {"id": 3006, "name": "ENGLISH_1_TO_6", "description": "1–6 English letters", "shape": "text", "price": "15"},
    {"id": 3007, "name": "ENGLISH_1_TO_7", "description": "1–7 English letters", "shape": "text", "price": "17.5"},
    {"id": 3008, "name": "ENGLISH_1_TO_8", "description": "1–8 English letters", "shape": "text", "price": "20"},
    {"id": 3012, "name": "ENGLISH_1_TO_12", "description": "1–12 English letters", "shape": "text", "price": "30"},
    {"id": 4004, "name": "DIGITS_1_TO_4", "description": "1–4 digits", "shape": "text", "price": "10"},
    {"id": 4005, "name": "DIGITS_1_TO_5", "description": "1–5 digits", "shape": "text", "price": "12"},
    {"id": 4006, "name": "DIGITS_1_TO_6", "description": "1–6 digits", "shape": "text", "price": "15"},
    {"id": 4007, "name": "DIGITS_1_TO_7", "description": "1–7 digits", "shape": "text", "price": "17.5"},
    {"id": 4008, "name": "DIGITS_1_TO_8", "description": "1–8 digits", "shape": "text", "price": "20"},
    {"id": 5000, "name": "MIXED_VARIABLE", "description": "Variable-length Chinese, English, and digits", "shape": "text", "price": "2.5 per letter, 10 per character (base 10)"},
    {"id": 5108, "name": "ALNUM_SYMBOLS_8", "description": "8 letters or digits, symbols allowed", "shape": "text", "price": "22"},
    {"id": 5201, "name": "PINYIN_CALC_IDIOM", "description": "Pinyin initials, arithmetic, or idiom", "shape": "text", "price": "20 / 20 / 40"},
    {"id": 6001, "name": "CALCULATION", "description": "Arithmetic image; returns the computed result", "shape": "text", "price": "15"},
    {"id": 6004, "name": "QUESTION", "description": "Question / answer image", "shape": "text", "price": "15"},
    {"id": 6900, "name": "MIXED_COLOR", "description": "Mixed text, optionally filtered with an 8f color instruction", "shape": "text", "price": "2.5 per letter, 10 per character (base 10); 8f costs 8"},
    {"id": 9602, "name": "HORIZONTAL_PUZZLE", "description": "Horizontal jigsaw; two points, slide by |x1-x2|", "shape": "points", "price": "36"},
    {"id": 9801, "name": "LOCATE_CHARS", "description": "Coordinates of characters named by an 8a instruction", "shape": "points", "price": "9 per hit, minimum 28"},
    {"id": 9800, "name": "LOCATE_ALL_TEXT", "description": "Every character plus its coordinate", "shape": "text-locations", "price": "6 per hit, minimum 28"},
    {"id": 9901, "name": "ONE_BLOCK_CENTER", "description": "Center of the single graphic block", "shape": "points", "price": "16"},
    {"id": 9902, "name": "TWO_BLOCK_CENTERS", "description": "Centers of the two graphic blocks", "shape": "points", "price": "24"},
    {"id": 9900, "name": "BLOCKS", "description": "Slider, gap, and shape rectangles", "shape": "rectangles", "price": "8 per hit + 8"},
    {"id": 9101, "name": "CLICK_1", "description": "One click coordinate from the on-image prompt", "shape": "points", "price": "16"},
    {"id": 9102, "name": "CLICK_2", "description": "Two click coordinates from the on-image prompt", "shape": "points", "price": "24"},
    {"id": 9103, "name": "CLICK_3", "description": "Three click coordinates from the on-image prompt", "shape": "points", "price": "32"},
    {"id": 9104, "name": "CLICK_4", "description": "Four click coordinates from the on-image prompt", "shape": "points", "price": "40"},
    {"id": 9004, "name": "CLICK_1_TO_4", "description": "1–4 click coordinates from the on-image prompt", "shape": "points", "price": "40"},
    {"id": 9005, "name": "CLICK_1_TO_5", "description": "1–5 click coordinates from the on-image prompt", "shape": "points", "price": "48"},
    {"id": 9006, "name": "CLICK_1_TO_6", "description": "1–6 click coordinates from the on-image prompt", "shape": "points", "price": "56"},
    {"id": 9008, "name": "CLICK_1_TO_8", "description": "1–8 click coordinates from the on-image prompt", "shape": "points", "price": "72"},
    {"id": 9009, "name": "CLICK_1_TO_9", "description": "1–9 click coordinates from the on-image prompt", "shape": "points", "price": "80"},
    {"id": 8601, "name": "LICENSE_PLATE", "description": "Mainland China license plates (prepaid resource pack)", "shape": "plates", "price": "resource pack"},
]

_BY_ID = {info["id"]: info for info in CODE_TYPES}


def describe_code_type(code_type: int | str) -> CodeTypeInfo | None:
    """Lookup a catalog entry. Unknown ids are not an error."""
    try:
        code_id = int(code_type)
    except (TypeError, ValueError):
        return None
    return _BY_ID.get(code_id)


def result_shape(code_type: int | str) -> ResultShape:
    """How to read ``pic_str``. Unknown types are treated as plain text."""
    info = describe_code_type(code_type)
    if info is None:
        return "text"
    return info["shape"]


class FreeModel:
    """Free OCR v2 models on api.chaojiying.com."""

    CALC = 6
    TEXT = 8
    BLOCKS = 9


def resolve_free_model(model: int | str) -> int:
    value = str(model).strip().lower()
    if value in {"6", "calc", "calculation"}:
        return 6
    if value in {"8", "text", "ocr"}:
        return 8
    if value in {"9", "blocks", "rectangles"}:
        return 9
    raise ValueError(f'Unknown free OCR model "{model}"')
