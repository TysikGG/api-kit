"""Response parsers shared by the sync and async clients."""

from __future__ import annotations

import json
import re
from typing import Any

from capguru.constants import DEFAULT_SLIDER_FIELD_WIDTH
from capguru.errors import api_error, capguru_error
from capguru.types import ClickSolution, GeeTestResult, JsonTaskResult, Point

_X = re.compile(r"(?:^|[,&\s])x=(-?\d+(?:\.\d+)?)", re.IGNORECASE)
_Y = re.compile(r"(?:^|[,&\s])y=(-?\d+(?:\.\d+)?)", re.IGNORECASE)
_W = re.compile(r"(?:^|[,&\s])w=(-?\d+(?:\.\d+)?)", re.IGNORECASE)
_LABELED = re.compile(r"coordinates?:\s*(.+)", re.IGNORECASE)
_CELLS = re.compile(r"^\d+(?:\s*,\s*\d+)*$")


def parse_click_answer(raw: str) -> ClickSolution:
    """Parse coordinates, a grid such as ``1,2,6,9``, or return the raw text."""
    text = re.sub(r"^OK\|", "", raw.strip(), count=1, flags=re.IGNORECASE)
    labeled = _LABELED.search(text)
    if labeled:
        points = _parse_points(labeled.group(1))
        if points:
            return ClickSolution(raw=text, points=points)
    if _CELLS.match(text):
        return ClickSolution(raw=text, cells=[int(part.strip()) for part in text.split(",")])
    unlabeled = _parse_points(text)
    if (
        unlabeled
        and re.search(r"x=", text, re.IGNORECASE)
        and re.search(r"y=", text, re.IGNORECASE)
    ):
        return ClickSolution(raw=text, points=unlabeled)
    return ClickSolution(raw=text)


def _parse_points(body: str) -> list[Point]:
    points: list[Point] = []
    for part in body.split(";"):
        piece = part.strip()
        if not piece:
            continue
        x = _X.search(piece)
        y = _Y.search(piece)
        if not x or not y:
            continue
        w = _W.search(piece)
        points.append(
            Point(x=float(x.group(1)), y=float(y.group(1)), w=float(w.group(1)) if w else None)
        )
    return points


def slider_offset(solution: ClickSolution) -> float | None:
    """Horizontal distance from the first point, if the answer has coordinates."""
    if not solution.points:
        return None
    return solution.points[0].x


def scale_slider_offset(
    offset: float,
    window_width: float,
    image_width: float | None = None,
    field_width: float | None = None,
) -> float:
    """Scale a slider offset into on-screen pixels.

    When ``image_width`` is set the formula is ``offset / image_width * window_width``.
    Otherwise Cap.guru's 271px reference field is used.
    """
    base = (
        image_width
        if image_width is not None
        else (field_width if field_width is not None else DEFAULT_SLIDER_FIELD_WIDTH)
    )
    if not base:
        return offset
    return (offset / base) * window_width


def parse_geetest(raw: str) -> GeeTestResult:
    """Normalize a GeeTest token. Plain text uses ``seccode = raw + '|jordan'``."""
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, dict):
        return GeeTestResult(
            challenge=str(parsed.get("geetest_challenge", parsed.get("challenge", ""))),
            validate=str(parsed.get("geetest_validate", parsed.get("validate", raw))),
            seccode=str(parsed.get("geetest_seccode", parsed.get("seccode", ""))),
        )
    return GeeTestResult(challenge="", validate=raw, seccode=f"{raw}|jordan")


def read_solution_token(solution: Any) -> str:
    """Pull a token or text out of an Anti-Captcha solution object."""
    if isinstance(solution, str):
        return solution
    if isinstance(solution, dict):
        for key in ("gRecaptchaResponse", "token", "text", "request"):
            value = solution.get(key)
            if isinstance(value, str):
                return value
    return json.dumps(solution)


def coerce_rucaptcha(data: Any) -> dict[str, Any] | None:
    """Normalize a RuCaptcha-style payload to ``{status, request}``."""
    if isinstance(data, (int, float)) and not isinstance(data, bool):
        return {"status": 1, "request": data}
    if isinstance(data, bool):
        return {"status": 1, "request": data}
    if isinstance(data, str):
        text = data.strip()
        if not text:
            return None
        if text.startswith("OK|"):
            return {"status": 1, "request": text[3:]}
        if text == "OK":
            return {"status": 1, "request": "OK"}
        if text.startswith("ERROR") or text in {"CAPCHA_NOT_READY", "notpic"}:
            return {"status": 0, "request": text}
        return {"status": 1, "request": text}
    if isinstance(data, dict):
        return data
    return None


def _success(status: Any) -> bool:
    return status in (1, "1")


def _failure(status: Any) -> bool:
    return status in (0, "0")


def request_to_string(request: Any) -> str:
    if isinstance(request, str):
        return request
    if isinstance(request, (int, float, bool)) and not isinstance(request, bool):
        return str(request)
    if isinstance(request, bool):
        return str(request)
    return json.dumps(request)


def read_task_id(data: Any) -> str:
    payload = coerce_rucaptcha(data)
    if payload:
        request = payload.get("request")
        if _success(payload.get("status")) and request is not None and str(request) != "":
            return str(request)
        if _failure(payload.get("status")) and request:
            raise api_error(str(request), data)
    json_id = _json_task_id(data)
    if json_id:
        return json_id
    raise capguru_error(
        f"Unexpected /in.php response: {data!r}", code="INVALID_RESPONSE", response_data=data
    )


def read_solution(data: Any) -> str:
    payload = coerce_rucaptcha(data)
    if payload:
        request = payload.get("request")
        if _success(payload.get("status")) and request is not None:
            return request_to_string(request)
        if _failure(payload.get("status")) and request:
            raise api_error(str(request), data)
    raise capguru_error(
        f"Unexpected /res.php response: {data!r}", code="INVALID_RESPONSE", response_data=data
    )


def _json_task_id(data: Any) -> str | None:
    if not isinstance(data, dict):
        return None
    error_id = data.get("errorId")
    if isinstance(error_id, int) and error_id != 0:
        code = str(data.get("errorCode") or data.get("errorDescription") or "ERROR")
        raise api_error(code, data)
    if data.get("taskId") is not None and "status" not in data:
        return str(data["taskId"])
    return None


def read_json_task_id(data: Any) -> str:
    found = _json_task_id(data)
    if found:
        return found
    payload = coerce_rucaptcha(data)
    if payload and _failure(payload.get("status")) and payload.get("request"):
        raise api_error(str(payload["request"]), data)
    raise capguru_error(
        f"Unexpected /createTask response: {data!r}",
        code="INVALID_RESPONSE",
        response_data=data,
    )


def read_json_task_result(task_id: str, data: Any) -> JsonTaskResult | None:
    if not isinstance(data, dict):
        payload = coerce_rucaptcha(data)
        if payload and _failure(payload.get("status")) and payload.get("request"):
            if str(payload["request"]) == "CAPCHA_NOT_READY":
                return None
            raise api_error(str(payload["request"]), data)
        raise capguru_error(
            f"Unexpected /getTaskResult response: {data!r}",
            code="INVALID_RESPONSE",
            response_data=data,
        )
    error_id = data.get("errorId")
    if isinstance(error_id, int) and error_id != 0:
        code = str(data.get("errorCode") or data.get("errorDescription") or "ERROR")
        if code == "CAPCHA_NOT_READY":
            return None
        raise api_error(code, data)
    status = data.get("status") if isinstance(data.get("status"), str) else ""
    if status in {"processing", "pending"}:
        return None
    if status == "ready":
        return JsonTaskResult(
            task_id=str(data.get("taskId", task_id)),
            status=status,
            solution=data.get("solution"),
            raw=data,
        )
    payload = coerce_rucaptcha(data)
    if payload and _success(payload.get("status")) and payload.get("request") is not None:
        return JsonTaskResult(
            task_id=task_id, status="ready", solution=payload.get("request"), raw=data
        )
    if payload and _failure(payload.get("status")) and payload.get("request"):
        if str(payload["request"]) == "CAPCHA_NOT_READY":
            return None
        raise api_error(str(payload["request"]), data)
    raise capguru_error(
        f"Unexpected /getTaskResult response: {data!r}",
        code="INVALID_RESPONSE",
        response_data=data,
    )


def raise_for_http(status: int, data: Any) -> Any:
    """Return ``data`` for HTTP success, or raise a CapGuru error."""
    if status < 400:
        return data
    payload = coerce_rucaptcha(data)
    if payload and _failure(payload.get("status")) and payload.get("request"):
        raise api_error(str(payload["request"]), data)
    raise capguru_error(f"HTTP {status}: {data!r}", code="HTTP_ERROR", response_data=data)
