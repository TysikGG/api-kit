import base64
import hashlib
import os
import re
from typing import Any

import httpx

from .errors import ChaojiyingError
from .types import RecognizeResult, ReportErrorResult, ScoreResult

SOFT_ID = "984642"
SOFT_KEY = "369fe52d5cdbb147892a40ac78f13e60"


class Chaojiying:
    """Client for the Chaojiying (超级鹰) CAPTCHA recognition API.

    Attributes:
        username: Chaojiying username.
        base_url: Base URL of the Chaojiying API.
    """

    def __init__(
        self,
        username: str | None = None,
        password: str | None = None,
        base_url: str | None = None,
        timeout: float = 60.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the Chaojiying client.

        Args:
            username: Chaojiying username. Defaults to CHAOJIYING_USER environment variable.
            password: Chaojiying password. Defaults to CHAOJIYING_PASS environment variable.
            base_url: Base URL for the Chaojiying API. Defaults to https://upload.chaojiying.net.
            timeout: HTTP request timeout in seconds. Defaults to 60.0.
            user_agent: Custom User-Agent header string.

        Raises:
            ChaojiyingError: If username or password is not provided.

        Examples:
            >>> from chaojiying import Chaojiying
            >>> client = Chaojiying(username="my_user", password="my_password")
            >>> score = client.get_score()
            >>> print(score["tifen"])
        """
        user = username or os.environ.get("CHAOJIYING_USER")
        pwd = password or os.environ.get("CHAOJIYING_PASS")

        if not user:
            raise ChaojiyingError("Chaojiying username is required.")
        if not pwd:
            raise ChaojiyingError("Chaojiying password is required.")

        self.username = user
        self.password_hash = self._hash_password(pwd)
        self.base_url = (base_url or "https://upload.chaojiying.net").rstrip("/")
        ua = user_agent or "chaojiying-client/0.1.0"

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "User-Agent": ua,
                "Accept": "application/json",
            },
        )

    def _hash_password(self, password: str) -> str:
        if re.match(r"^[0-9a-fA-F]{32}$", password):
            return password.lower()
        return hashlib.md5(password.encode("utf-8")).hexdigest()

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "Chaojiying":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def _post_form(self, path: str, data: dict[str, str]) -> dict[str, Any]:
        try:
            response = self._client.post(path, data=data)
            response.raise_for_status()
            res_json = response.json()

            err_no = res_json.get("err_no")
            if err_no is not None and err_no != 0:
                err_str = res_json.get("err_str", "Unknown error")
                raise ChaojiyingError(
                    message=f"Chaojiying error {err_no}: {err_str}",
                    err_no=err_no,
                    err_str=err_str,
                    response_body=res_json,
                )
            return res_json
        except httpx.HTTPStatusError as e:
            try:
                data_err = e.response.json()
            except Exception:
                data_err = None
            err_no = data_err.get("err_no") if isinstance(data_err, dict) else None
            err_str = data_err.get("err_str") if isinstance(data_err, dict) else None
            raise ChaojiyingError(
                message=err_str or str(e),
                err_no=err_no,
                err_str=err_str,
                response_body=data_err,
            ) from e
        except httpx.RequestError as e:
            raise ChaojiyingError(f"HTTP request failed: {e}") from e

    def get_score(self) -> ScoreResult:
        """Retrieves user account remaining points (tifen) and locked points.

        Returns:
            Dictionary containing err_no, err_str, tifen, and tifen_lock.

        Examples:
            >>> score = client.get_score()
            >>> print(f"Available points: {score['tifen']}")
        """
        data = {
            "user": self.username,
            "pass2": self.password_hash,
        }
        res = self._post_form("/Upload/GetScore.php", data)
        return ScoreResult(
            err_no=res["err_no"],
            err_str=res["err_str"],
            tifen=res["tifen"],
            tifen_lock=res.get("tifen_lock", 0),
        )

    def recognize(
        self,
        image: bytes | str,
        code_type: int | str,
        str_debug: str | None = None,
    ) -> RecognizeResult:
        """Recognizes a CAPTCHA image and returns the parsed result.

        Args:
            image: Image data as raw bytes or Base64 string.
            code_type: CAPTCHA type ID (e.g. 1004 for 4-letter alphanumeric, 1902 for general).
            str_debug: Optional debug instructions string.

        Returns:
            Dictionary containing err_no, err_str, pic_id, pic_str, and md5.

        Examples:
            >>> with open("captcha.jpg", "rb") as f:
            ...     result = client.recognize(f.read(), code_type=1004)
            >>> print(result["pic_str"])
        """
        if isinstance(image, bytes):
            b64_str = base64.b64encode(image).decode("ascii")
        else:
            b64_str = re.sub(r"^data:image/[a-zA-Z]+;base64,", "", image)

        data = {
            "user": self.username,
            "pass2": self.password_hash,
            "softid": SOFT_ID,
            "codetype": str(code_type),
            "file_base64": b64_str,
        }
        if str_debug:
            data["str_debug"] = str_debug

        res = self._post_form("/Upload/Processing.php", data)
        return RecognizeResult(
            err_no=res["err_no"],
            err_str=res["err_str"],
            pic_id=str(res.get("pic_id", "")),
            pic_str=str(res.get("pic_str", "")),
            md5=str(res.get("md5", "")),
        )

    def report_error(self, pic_id: str) -> ReportErrorResult:
        """Reports an incorrect CAPTCHA solution to request a point refund.

        Must be called within 3 minutes of receiving the picture ID.

        Args:
            pic_id: Unique image ID returned by recognize (pic_id).

        Returns:
            Dictionary containing err_no and err_str.

        Examples:
            >>> client.report_error(result["pic_id"])
        """
        data = {
            "user": self.username,
            "pass2": self.password_hash,
            "softid": SOFT_ID,
            "id": pic_id,
        }
        res = self._post_form("/Upload/ReportError.php", data)
        return ReportErrorResult(
            err_no=res["err_no"],
            err_str=res["err_str"],
        )
