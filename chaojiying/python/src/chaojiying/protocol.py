"""Shared request building and response handling for the sync and async clients."""

from __future__ import annotations

import base64
import hashlib
import math
import re
from dataclasses import dataclass, field
from typing import Any

from .codes import resolve_free_model, result_shape
from .errors import (
    ChaojiyingError,
    ImageTooLargeError,
    InvalidImageError,
    MalformedBase64Error,
    MissingCredentialsError,
    NetworkError,
    RateLimitError,
    ResponseIntegrityError,
    create_api_error,
)
from .errors import (
    TimeoutError as RequestTimeoutError,
)
from .parse import (
    MAX_FREE_IMAGE_BYTES,
    MAX_PAID_IMAGE_BYTES,
    parse_plates,
    parse_points,
    parse_rectangles,
    parse_text_locations,
    verify_response_md5,
)
from .types import RecognizeResult, ReportErrorResult, ScoreResult

SCORE_PATH = "/Upload/GetScore.php"
PROCESSING_PATH = "/Upload/Processing.php"
REPORT_PATH = "/Upload/ReportError.php"
_BASE64_RE = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")
_DATA_URI_RE = re.compile(r"^data:image/[a-z0-9.+-]+;base64,", re.IGNORECASE)


@dataclass
class PreparedImage:
    data: bytes
    base64: str


@dataclass
class Call:
    path: str
    policy: str
    data: dict[str, str] | None = None
    json_body: dict[str, str] | None = None
    files: dict[str, tuple[str, bytes, str]] | None = None
    params: dict[str, str] | None = None
    free: bool = False


@dataclass
class Session:
    username: str | None
    password_hash: str | None
    access_token: str | None
    api_key: str | None
    soft_id: str
    soft_key: str
    retries: int
    retry_delay: float
    auth: dict[str, str] = field(init=False)

    def __post_init__(self) -> None:
        fields: dict[str, str] = {}
        if self.access_token:
            fields["access_token"] = self.access_token
        if self.username and self.password_hash:
            fields["user"] = self.username
            fields["pass2"] = self.password_hash
        self.auth = fields


def hash_password(password: str) -> str:
    if re.fullmatch(r"[0-9a-fA-F]{32}", password):
        return password.lower()
    return hashlib.md5(password.encode("utf-8")).hexdigest()


def prepare_image(image: Any, max_bytes: int) -> PreparedImage:
    if hasattr(image, "read"):
        image = image.read()
    if isinstance(image, str):
        stripped = _DATA_URI_RE.sub("", image)
        stripped = re.sub(r"\s+", "", stripped)
        if not stripped:
            raise InvalidImageError("Image data is empty.", err_no=-10061, err_str="不是有效的图片文件")
        normalized = stripped.replace("-", "+").replace("_", "/")
        if not _BASE64_RE.fullmatch(normalized):
            raise MalformedBase64Error(
                "file_base64 is not valid base64.",
                err_no=-100612,
                err_str="base64字符解析异常",
            )
        raw = base64.b64decode(normalized, validate=False)
        _assert_size(raw, max_bytes)
        return PreparedImage(raw, base64.b64encode(raw).decode("ascii"))
    if isinstance(image, bytearray):
        image = bytes(image)
    if not isinstance(image, bytes):
        raise ChaojiyingError("Image must be bytes, base64 text, or a binary file.")
    _assert_size(image, max_bytes)
    return PreparedImage(image, base64.b64encode(image).decode("ascii"))


def _assert_size(raw: bytes, max_bytes: int) -> None:
    if len(raw) == 0:
        raise InvalidImageError("Image data is empty.", err_no=-10061, err_str="不是有效的图片文件")
    if len(raw) > max_bytes:
        limit = "2MB" if max_bytes == MAX_FREE_IMAGE_BYTES else "1024KB"
        raise ImageTooLargeError(
            f"Image is {len(raw)} bytes; the limit is {limit}.",
            err_no=-10062,
            err_str="文件超大 1024k",
        )


def recognize_fields(
    session: Session,
    code_type: int | str,
    prepared: PreparedImage | None,
    *,
    str_debug: str | None,
    len_min: int | None,
    time_add: int | None,
    include_base64: bool,
) -> dict[str, str]:
    fields = {**session.auth, "softid": session.soft_id, "codetype": str(code_type)}
    if str_debug:
        fields["str_debug"] = str_debug
    if len_min is not None:
        fields["len_min"] = str(len_min)
    if time_add is not None:
        fields["time_add"] = str(time_add)
    if include_base64 and prepared is not None:
        fields["file_base64"] = prepared.base64
    return fields


def build_recognize_call(
    session: Session,
    image: Any,
    code_type: int | str,
    *,
    str_debug: str | None = None,
    len_min: int | None = None,
    time_add: int | None = None,
    upload: str = "base64",
    filename: str = "captcha.jpg",
    body_format: str = "form",
) -> Call:
    if code_type == "" or code_type is None or (
        isinstance(code_type, float) and not math.isfinite(code_type)
    ):
        raise ChaojiyingError("codetype is required.")
    prepared = prepare_image(image, MAX_PAID_IMAGE_BYTES)
    common = {
        "str_debug": str_debug,
        "len_min": len_min,
        "time_add": time_add,
    }
    if upload == "multipart":
        fields = recognize_fields(session, code_type, prepared, include_base64=False, **common)
        return Call(
            path=PROCESSING_PATH,
            policy="paid",
            data=fields,
            files={"userfile": (filename, prepared.data, "application/octet-stream")},
        )
    fields = recognize_fields(session, code_type, prepared, include_base64=True, **common)
    if body_format == "json":
        return Call(path=PROCESSING_PATH, policy="paid", json_body=fields)
    return Call(path=PROCESSING_PATH, policy="paid", data=fields)


def build_free_call(
    session: Session,
    image: Any,
    model: int | str,
    *,
    upload: str = "base64",
    filename: str = "captcha.jpg",
    api_key: str | None = None,
) -> tuple[Call, str]:
    try:
        resolved = resolve_free_model(model)
    except ValueError as exc:
        raise ChaojiyingError(str(exc)) from exc
    key = api_key or session.api_key
    if not key:
        raise MissingCredentialsError("Free OCR requires an API key (api_key or CHAOJIYING_API_KEY).")
    prepared = prepare_image(image, MAX_FREE_IMAGE_BYTES)
    shape = "rectangles" if resolved == 9 else "text"
    if upload == "multipart":
        call = Call(
            path=f"/ocr/v2/{resolved}",
            policy="safe",
            files={"userfile": (filename, prepared.data, "application/octet-stream")},
            params={"ak": key},
            free=True,
        )
    else:
        call = Call(
            path=f"/ocr/v2/{resolved}",
            policy="safe",
            data={"file_base64": prepared.base64},
            params={"ak": key},
            free=True,
        )
    return call, shape


def shape_score(data: dict[str, Any]) -> ScoreResult:
    return ScoreResult(
        {
            "err_no": as_number(data.get("err_no")),
            "err_str": as_string(data.get("err_str")),
            "tifen": as_number(data.get("tifen")),
            "tifen_lock": 0 if data.get("tifen_lock") is None else as_number(data.get("tifen_lock")),
        }
    )


def shape_report(data: dict[str, Any]) -> ReportErrorResult:
    return ReportErrorResult(
        {"err_no": as_number(data.get("err_no")), "err_str": as_string(data.get("err_str"))}
    )


def shape_recognize(
    data: dict[str, Any],
    code_type: int | str,
    *,
    verify_md5: bool,
    session: Session,
    shape: str | None = None,
) -> RecognizeResult:
    result = _shape_result(data, shape or result_shape(code_type))
    if not verify_md5:
        return result
    if not session.soft_key:
        raise ResponseIntegrityError(
            "soft_key is required to verify md5 when soft_id is not the built-in partner id.",
        )
    if not result.get("md5"):
        raise ResponseIntegrityError("Response did not include an md5 checksum.", response_body=data)
    if not verify_response_md5(result, session.soft_id, session.soft_key):
        raise ResponseIntegrityError(
            "Response md5 did not match softid, softkey, pic_id, and pic_str.",
            response_body=data,
        )
    return result


def _shape_result(data: dict[str, Any], shape: str) -> RecognizeResult:
    pic_id = data.get("pic_id")
    pic_str = data.get("pic_str")
    result = RecognizeResult(
        {
            "err_no": as_number(data.get("err_no")),
            "err_str": as_string(data.get("err_str")),
            "pic_id": "" if pic_id is None else str(pic_id),
            "pic_str": "" if pic_str is None else str(pic_str),
        }
    )
    md5 = data.get("md5")
    if isinstance(md5, str) and md5:
        result["md5"] = md5
    if not result["pic_str"]:
        return result
    try:
        if shape == "points":
            result["points"] = parse_points(result["pic_str"])
        elif shape == "rectangles":
            result["rectangles"] = parse_rectangles(result["pic_str"])
        elif shape == "text-locations":
            result["text_locations"] = parse_text_locations(result["pic_str"])
        elif shape == "plates":
            result["plates"] = parse_plates(result["pic_str"])
    except ChaojiyingError:
        pass
    return result


def interpret_response(status: int, data: Any) -> dict[str, Any]:
    if isinstance(data, dict) and data.get("err_no") is not None:
        err_no = as_number(data.get("err_no"))
        if err_no != 0:
            err_str = data.get("err_str")
            raise create_api_error(err_no, err_str if isinstance(err_str, str) else None, data)
        return data
    if status == 429:
        raise RateLimitError(
            "Chaojiying error -429: 请求过于频繁",
            err_no=-429,
            err_str="请求过于频繁",
            response_body=data,
        )
    if status >= 400:
        raise NetworkError(f"HTTP {status}", status=status, connect_failure=False, response_body=data)
    if not isinstance(data, dict):
        raise ChaojiyingError("Chaojiying returned a non-JSON response.", response_body=data)
    raise ChaojiyingError("Chaojiying response did not include err_no.", response_body=data)


def is_retryable(exc: BaseException, policy: str) -> bool:
    if isinstance(exc, RateLimitError):
        return True
    if isinstance(exc, RequestTimeoutError):
        return policy == "safe"
    if isinstance(exc, NetworkError):
        return policy == "safe" or exc.connect_failure
    return False


def as_number(value: Any) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ChaojiyingError(f"Expected a number but received {value!r}.")
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ChaojiyingError(f"Expected a number but received {value!r}.")
        try:
            number: int | float = float(text) if any(ch in text for ch in ".eE") else int(text)
        except ValueError as exc:
            raise ChaojiyingError(f"Expected a number but received {value!r}.") from exc
    else:
        number = value
    if isinstance(number, float) and not math.isfinite(number):
        raise ChaojiyingError(f"Expected a number but received {value!r}.")
    if isinstance(number, float) and number.is_integer():
        return int(number)
    return number


def as_string(value: Any) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    return str(value)
