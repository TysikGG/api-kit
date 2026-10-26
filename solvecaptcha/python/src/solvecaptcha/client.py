"""SolveCaptcha API client implementation."""

import json
import time
from typing import Any

import httpx

from .errors import ERROR_DESCRIPTIONS, SolveCaptchaError
from .types import GeeTestResult

DEFAULT_SOFT_ID = ""
DEFAULT_BASE_URL = "https://api.solvecaptcha.com"


class SolveCaptchaClient:
    """Client for the SolveCaptcha human and AI captcha solving service.

    Args:
        api_key: SolveCaptcha API key.
        base_url: Base URL of the API. Defaults to https://api.solvecaptcha.com.
        timeout: HTTP request timeout in seconds. Defaults to 30.0.
        soft_id: Optional software/partner identifier.
        default_polling_timeout: Default timeout in seconds when waiting for solutions.
        default_polling_interval: Default interval in seconds between status polls.

    Examples:
        >>> from solvecaptcha import SolveCaptchaClient
        >>> client = SolveCaptchaClient(api_key="your_api_key")
        >>> balance = client.get_balance()
        >>> print(balance)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        soft_id: str | int | None = None,
        default_polling_timeout: float = 120.0,
        default_polling_interval: float = 5.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise SolveCaptchaError(
                "api_key is required to initialize SolveCaptchaClient", "ERROR_KEY_DOES_NOT_EXIST"
            )
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.soft_id = str(soft_id) if soft_id is not None else DEFAULT_SOFT_ID
        self.polling_timeout = default_polling_timeout
        self.polling_interval = default_polling_interval
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout)

    def __enter__(self) -> "SolveCaptchaClient":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def get_balance(self) -> float:
        """Retrieves the current account balance in USD.

        Returns:
            The account balance as a float.

        Raises:
            SolveCaptchaError: If the server returns an error or unexpected response.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> balance = client.get_balance()
            >>> print(f"Balance: ${balance:.4f}")
        """
        raw = self._query_result({"action": "getbalance"})
        try:
            return float(raw)
        except ValueError as exc:
            raise SolveCaptchaError(f"Failed to parse balance: {raw}", "PARSE_ERROR", raw) from exc

    def solve_image(
        self,
        body: str,
        phrase: int | None = None,
        regsense: int | None = None,
        numeric: int | None = None,
        calc: int | None = None,
        min_len: int | None = None,
        max_len: int | None = None,
        language: int | None = None,
        textinstructions: str | None = None,
    ) -> str:
        """Solves a normal image-based captcha from base64 data.

        Args:
            body: Base64-encoded image string.
            phrase: 0 = single word, 1 = multiple words.
            regsense: 0 = case-insensitive, 1 = case-sensitive.
            numeric: Character set constraint (0..4).
            calc: 1 if math calculation is required.
            min_len: Minimum character length.
            max_len: Maximum character length.
            language: 0 = default, 1 = Cyrillic, 2 = Latin.
            textinstructions: Instructions for human worker.

        Returns:
            Solved text from the image.

        Raises:
            SolveCaptchaError: If submission fails or times out.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> text = client.solve_image(body="iVBORw0KGgoAAAANSUhEUgAA...")
            >>> print("Captcha text:", text)
        """
        params: dict[str, Any] = {"method": "base64", "body": body}
        if phrase is not None:
            params["phrase"] = phrase
        if regsense is not None:
            params["regsense"] = regsense
        if numeric is not None:
            params["numeric"] = numeric
        if calc is not None:
            params["calc"] = calc
        if min_len is not None:
            params["min_len"] = min_len
        if max_len is not None:
            params["max_len"] = max_len
        if language is not None:
            params["language"] = language
        if textinstructions is not None:
            params["textinstructions"] = textinstructions

        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_text(self, text: str, language: int | None = None) -> str:
        """Solves a text question captcha.

        Args:
            text: Question string to solve.
            language: 0 = default, 1 = Cyrillic, 2 = Latin.

        Returns:
            Text answer to the question.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> answer = client.solve_text("If tomorrow is Saturday, what day is today?")
            >>> print("Answer:", answer)
        """
        params: dict[str, Any] = {"textcaptcha": text}
        if language is not None:
            params["language"] = language

        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_recaptcha_v2(
        self,
        googlekey: str,
        pageurl: str,
        invisible: bool = False,
        data_s: str | None = None,
    ) -> str:
        """Solves Google reCAPTCHA V2.

        Args:
            googlekey: Sitekey extracted from target page.
            pageurl: Full URL of the page with the reCAPTCHA.
            invisible: True if widget is invisible.
            data_s: Optional 'data-s' parameter value.

        Returns:
            reCAPTCHA token solution string.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> token = client.solve_recaptcha_v2(
            ...     googlekey="6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
            ...     pageurl="https://example.com/login",
            ... )
        """
        params: dict[str, Any] = {
            "method": "userrecaptcha",
            "googlekey": googlekey,
            "pageurl": pageurl,
        }
        if invisible:
            params["invisible"] = 1
        if data_s:
            params["data-s"] = data_s

        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_recaptcha_v3(
        self,
        googlekey: str,
        pageurl: str,
        action: str | None = None,
        min_score: float | None = None,
    ) -> str:
        """Solves Google reCAPTCHA V3.

        Args:
            googlekey: Sitekey extracted from target page.
            pageurl: Full URL of the page.
            action: Action parameter string.
            min_score: Minimum required score threshold (e.g. 0.7).

        Returns:
            reCAPTCHA token solution string.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> token = client.solve_recaptcha_v3(
            ...     googlekey="6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
            ...     pageurl="https://example.com/page",
            ...     action="verify",
            ... )
        """
        params: dict[str, Any] = {
            "method": "userrecaptcha",
            "version": "v3",
            "googlekey": googlekey,
            "pageurl": pageurl,
        }
        if action:
            params["action"] = action
        if min_score is not None:
            params["min_score"] = min_score

        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_turnstile(
        self,
        sitekey: str,
        pageurl: str,
        action: str | None = None,
        data: str | None = None,
        pagedata: str | None = None,
    ) -> str:
        """Solves Cloudflare Turnstile captcha.

        Args:
            sitekey: Turnstile sitekey.
            pageurl: URL of the protected page.
            action: Optional action parameter.
            data: Optional cData parameter.
            pagedata: Optional pagedata parameter.

        Returns:
            Turnstile token solution string.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> token = client.solve_turnstile(
            ...     sitekey="0x4AAAAAAABnEBq1w7gYv_m-",
            ...     pageurl="https://example.com",
            ... )
        """
        params: dict[str, Any] = {
            "method": "turnstile",
            "sitekey": sitekey,
            "pageurl": pageurl,
        }
        if action:
            params["action"] = action
        if data:
            params["data"] = data
        if pagedata:
            params["pagedata"] = pagedata

        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_funcaptcha(
        self,
        publickey: str,
        pageurl: str,
        surl: str | None = None,
        data: dict[str, Any] | str | None = None,
    ) -> str:
        """Solves Arkose Labs FunCaptcha.

        Args:
            publickey: Public key of the widget.
            pageurl: URL containing the FunCaptcha.
            surl: Custom service URL.
            data: Additional data payload.

        Returns:
            FunCaptcha solution token.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> token = client.solve_funcaptcha(
            ...     publickey="69A21A01-CC43-44CC-A7DC-3E088835E78D",
            ...     pageurl="https://example.com/signup",
            ... )
        """
        params: dict[str, Any] = {
            "method": "funcaptcha",
            "publickey": publickey,
            "pageurl": pageurl,
        }
        if surl:
            params["surl"] = surl
        if data:
            params["data"] = json.dumps(data) if isinstance(data, dict) else str(data)

        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_geetest(
        self,
        gt: str,
        challenge: str,
        pageurl: str,
        api_server: str | None = None,
    ) -> GeeTestResult:
        """Solves GeeTest captcha.

        Args:
            gt: GeeTest 'gt' token.
            challenge: GeeTest 'challenge' token.
            pageurl: URL of the page containing GeeTest.
            api_server: Optional custom api_server domain.

        Returns:
            GeeTestResult with challenge, validate, and seccode.

        Examples:
            >>> client = SolveCaptchaClient(api_key="key")
            >>> res = client.solve_geetest(
            ...     gt="022397c99c9d64352069eab73bc373d7",
            ...     challenge="3049170ffb08bb6b907572ca35489f07",
            ...     pageurl="https://example.com/geetest",
            ... )
            >>> print(res.validate)
        """
        params: dict[str, Any] = {
            "method": "geetest",
            "gt": gt,
            "challenge": challenge,
            "pageurl": pageurl,
        }
        if api_server:
            params["api_server"] = api_server

        task_id = self.create_task(params)
        raw = self.wait_for_result(task_id)

        try:
            parsed = json.loads(raw)
            return GeeTestResult(
                challenge=parsed["challenge"],
                validate=parsed["validate"],
                seccode=parsed["seccode"],
            )
        except (json.JSONDecodeError, KeyError) as exc:
            raise SolveCaptchaError(
                f"Failed to parse GeeTest solution: {raw}", "PARSE_ERROR", raw
            ) from exc

    def create_task(self, params: dict[str, Any]) -> str:
        """Submits a captcha solving task to /in.php.

        Args:
            params: Parameters specifying captcha type and payload.

        Returns:
            Task ID string.

        Raises:
            SolveCaptchaError: If task submission is rejected.
        """
        payload: dict[str, Any] = {
            "key": self.api_key,
            "json": 1,
            **params,
        }
        if self.soft_id and "soft_id" not in payload:
            payload["soft_id"] = self.soft_id

        try:
            resp = self._client.post("/in.php", params=payload)
            resp.raise_for_status()
            data = resp.json()

            if isinstance(data, dict):
                if data.get("status") == 1 and data.get("request"):
                    return str(data["request"])
                if data.get("status") == 0 and data.get("request"):
                    code = str(data["request"])
                    desc = ERROR_DESCRIPTIONS.get(code, f"SolveCaptcha error: {code}")
                    raise SolveCaptchaError(desc, code=code, response_body=data)

            raise SolveCaptchaError(
                f"Unexpected /in.php response: {resp.text}", "INVALID_RESPONSE", data
            )
        except httpx.HTTPError as exc:
            raise SolveCaptchaError(f"create_task request failed: {exc}", "NETWORK_ERROR") from exc

    def get_task_result(self, task_id: str) -> str | None:
        """Checks the resolution status of an active task.

        Args:
            task_id: Task ID returned by create_task.

        Returns:
            Solution string or None if still processing.
        """
        try:
            return self._query_result({"action": "get", "id": task_id})
        except SolveCaptchaError as exc:
            if exc.code == "CAPCHA_NOT_READY":
                return None
            raise

    def wait_for_result(
        self,
        task_id: str,
        timeout: float | None = None,
        interval: float | None = None,
    ) -> str:
        """Polls until a task is solved or timeout occurs.

        Args:
            task_id: Task ID.
            timeout: Maximum seconds to wait.
            interval: Polling frequency in seconds.

        Returns:
            Solved captcha response string.

        Raises:
            SolveCaptchaError: If timed out or task encounters an error.
        """
        effective_timeout = timeout if timeout is not None else self.polling_timeout
        effective_interval = interval if interval is not None else self.polling_interval
        start = time.time()

        while time.time() - start < effective_timeout:
            res = self.get_task_result(task_id)
            if res is not None:
                return res
            time.sleep(effective_interval)

        raise SolveCaptchaError(
            f"Captcha solving timed out after {effective_timeout}s",
            "TIMEOUT",
        )

    def report_good(self, task_id: str) -> bool:
        """Reports a correctly solved captcha.

        Args:
            task_id: Task ID.

        Returns:
            True if report was recorded.
        """
        try:
            res = self._query_result({"action": "reportgood", "id": task_id})
            return res == "OK_REPORT_RECORDED"
        except SolveCaptchaError:
            return False

    def report_bad(self, task_id: str) -> bool:
        """Reports an incorrectly solved captcha.

        Args:
            task_id: Task ID.

        Returns:
            True if report was recorded.
        """
        try:
            res = self._query_result({"action": "reportbad", "id": task_id})
            return res == "OK_REPORT_RECORDED"
        except SolveCaptchaError:
            return False

    def _query_result(self, params: dict[str, Any]) -> str:
        query = {"key": self.api_key, "json": 1, **params}
        try:
            resp = self._client.get("/res.php", params=query)
            resp.raise_for_status()
            data = resp.json()

            if isinstance(data, dict):
                if data.get("status") == 1 and data.get("request") is not None:
                    return str(data["request"])
                if data.get("status") == 0 and data.get("request"):
                    code = str(data["request"])
                    desc = ERROR_DESCRIPTIONS.get(code, f"SolveCaptcha error: {code}")
                    raise SolveCaptchaError(desc, code=code, response_body=data)

            raise SolveCaptchaError(
                f"Unexpected /res.php response: {resp.text}", "INVALID_RESPONSE", data
            )
        except httpx.HTTPError as exc:
            raise SolveCaptchaError(f"HTTP request failed: {exc}", "NETWORK_ERROR") from exc
