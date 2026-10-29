"""Errors returned by Chaojiying, one class per documented ``err_no``."""

from __future__ import annotations

from typing import Any


class ChaojiyingError(Exception):
    """Exception raised when a Chaojiying API operation fails."""

    def __init__(
        self,
        message: str,
        err_no: int | None = None,
        err_str: str | None = None,
        response_body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.err_no = err_no
        self.err_str = err_str
        self.response_body = response_body

    def __str__(self) -> str:
        if self.err_no is not None:
            return f"[{self.err_no}] {self.message}"
        return self.message


class ChaojiyingAPIError(ChaojiyingError):
    """An API response whose ``err_no`` is not zero."""


class UserParameterError(ChaojiyingAPIError):
    """err_no -1001."""


class AccessTokenError(ChaojiyingAPIError):
    """err_no -10012."""


class UnknownUserError(ChaojiyingAPIError):
    """err_no -1002."""


class PasswordError(ChaojiyingAPIError):
    """err_no -10023."""


class CodeTypeError(ChaojiyingAPIError):
    """err_no -1004."""


class InsufficientPointsError(ChaojiyingAPIError):
    """err_no -1005."""


class NoResourcePackError(ChaojiyingAPIError):
    """err_no -10052."""


class InvalidImageError(ChaojiyingAPIError):
    """err_no -10061."""


class Base64ParseError(ChaojiyingAPIError):
    """err_no -100612."""


class ImageTooLargeError(ChaojiyingAPIError):
    """err_no -10062."""


class UnrecognizableImageError(ChaojiyingAPIError):
    """err_no -10064."""


class IpWhitelistError(ChaojiyingAPIError):
    """err_no -10071."""


class IpBlacklistError(ChaojiyingAPIError):
    """err_no -10072."""


class UploadError(ChaojiyingAPIError):
    """err_no -2001."""


class RateLimitError(ChaojiyingAPIError):
    """err_no -429."""


class InvalidPictureIdError(ChaojiyingAPIError):
    """err_no -1011."""


class ErrorRateTooHighError(ChaojiyingAPIError):
    """err_no -1013."""


class PictureAlreadyReportedError(ChaojiyingAPIError):
    """err_no -10132."""


class ReportNotSupportedError(ChaojiyingAPIError):
    """err_no -10133."""


class MissingClickInstructionError(ChaojiyingAPIError):
    """err_no -10042. codetype 9801 needs an 8a instruction."""


class BadClickInstructionError(ChaojiyingAPIError):
    """err_no -10043."""


class MalformedBase64Error(ChaojiyingAPIError):
    """err_no -3002 or -100612 when base64 is rejected locally."""


class MissingCredentialsError(ChaojiyingError):
    """Username/password or an access token was not configured."""


class NetworkError(ChaojiyingError):
    """The HTTP call failed before a Chaojiying JSON error was available."""

    def __init__(
        self,
        message: str,
        err_no: int | None = None,
        err_str: str | None = None,
        response_body: Any = None,
        status: int | None = None,
        connect_failure: bool = False,
    ) -> None:
        super().__init__(message, err_no, err_str, response_body)
        self.status = status
        self.connect_failure = connect_failure


class TimeoutError(ChaojiyingError):
    """The HTTP call exceeded ``timeout``."""


class ResponseIntegrityError(ChaojiyingError):
    """The response ``md5`` did not match softid + softkey + pic_id + pic_str."""


class ErrorCodeInfo(dict[str, Any]):
    """Documented error code, official Chinese text, and remedy."""


ERROR_CODES: list[dict[str, Any]] = [
    {"err_no": -1001, "err_str": "用户参数异常", "remedy": "Send a valid username and password, or contact the software vendor.", "type": UserParameterError},
    {"err_no": -10012, "err_str": "access_token异常", "remedy": "Send a valid access_token.", "type": AccessTokenError},
    {"err_no": -1002, "err_str": "无此用户名", "remedy": "Send the Chaojiying account name, not the developer account.", "type": UnknownUserError},
    {"err_no": -10023, "err_str": "用户名的密码出错", "remedy": "Send the correct password. Reset it in the user center if needed.", "type": PasswordError},
    {"err_no": -1004, "err_str": "类型参数错误", "remedy": "Send a codetype from the price table.", "type": CodeTypeError},
    {"err_no": -1005, "err_str": "无可用题分", "remedy": "Recharge points in the user center.", "type": InsufficientPointsError},
    {"err_no": -10052, "err_str": "无可用资源包", "remedy": "Buy the resource pack required by this codetype (for example 8601).", "type": NoResourcePackError},
    {"err_no": -10061, "err_str": "不是有效的图片文件", "remedy": "Upload a real bmp, jpg, jpeg, or png image.", "type": InvalidImageError},
    {"err_no": -100612, "err_str": "base64字符解析异常", "remedy": "Send raw base64 with no data-URI prefix, spaces, or line breaks.", "type": Base64ParseError},
    {"err_no": -10062, "err_str": "文件超大 1024k", "remedy": "Keep paid uploads at or below 1024KB. Free OCR allows 2MB.", "type": ImageTooLargeError},
    {"err_no": -10064, "err_str": "图片无法被识别", "remedy": "Skip this image and submit the next one.", "type": UnrecognizableImageError},
    {"err_no": -10071, "err_str": "IP受限", "remedy": "Check the IP allow-list in the user center.", "type": IpWhitelistError},
    {"err_no": -10072, "err_str": "IP受限", "remedy": "Check the IP block-list in the user center.", "type": IpBlacklistError},
    {"err_no": -2001, "err_str": "上传图片出错", "remedy": "The upload failed. Retry once, then contact the vendor if it persists.", "type": UploadError},
    {"err_no": -429, "err_str": "请求过于频繁", "remedy": "Wait and retry. The client retries this code when retries > 0.", "type": RateLimitError},
    {"err_no": -1011, "err_str": "图片ID异常", "remedy": "Send the pic_id from a recent recognize response.", "type": InvalidPictureIdError},
    {"err_no": -1013, "err_str": "错误率太高", "remedy": "Stop reporting and check why answers are being marked wrong.", "type": ErrorRateTooHighError},
    {"err_no": -10132, "err_str": "此图片ID已报过", "remedy": "This pic_id was already reported.", "type": PictureAlreadyReportedError},
    {"err_no": -10133, "err_str": "no_access", "remedy": "This codetype does not support ReportError.", "type": ReportNotSupportedError},
    {"err_no": -10042, "err_str": "缺少8a指令", "remedy": "codetype 9801 requires str_debug {8a:字,符/8a}.", "type": MissingClickInstructionError},
    {"err_no": -10043, "err_str": "8a指令异常", "remedy": "Use half-width braces, colons, commas, and the /8a closer.", "type": BadClickInstructionError},
    {"err_no": -3002, "err_str": "base64字符异常", "remedy": "Remove whitespace and the data:image prefix before sending file_base64.", "type": MalformedBase64Error},
]

_BY_CODE = {info["err_no"]: info for info in ERROR_CODES}


def describe_error_code(err_no: int) -> dict[str, Any] | None:
    return _BY_CODE.get(err_no)


def create_api_error(err_no: int, err_str: str | None, response_body: Any = None) -> ChaojiyingAPIError:
    known = _BY_CODE.get(err_no)
    text = err_str or (known["err_str"] if known else "Unknown error")
    message = f"Chaojiying error {err_no}: {text}"
    ctor = known["type"] if known else ChaojiyingAPIError
    return ctor(message, err_no=err_no, err_str=text, response_body=response_body)
