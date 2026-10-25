from typing_extensions import TypedDict


class ScoreResult(TypedDict):
    """Result of account score query."""

    err_no: int
    err_str: str
    tifen: int
    tifen_lock: int


class RecognizeResult(TypedDict, total=False):
    """Result of CAPTCHA recognition."""

    err_no: int
    err_str: str
    pic_id: str
    pic_str: str
    md5: str


class ReportErrorResult(TypedDict):
    """Result of mistake report."""

    err_no: int
    err_str: str
