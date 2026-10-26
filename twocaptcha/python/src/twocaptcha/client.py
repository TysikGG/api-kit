import json
import time
from typing import Any

import httpx

from twocaptcha.errors import TwoCaptchaError
from twocaptcha.types import GeeTestResult

DEFAULT_SOFT_ID = "5920"


class TwoCaptchaClient:
    """Client for the 2Captcha solving API.

    Args:
        api_key: 2Captcha API key.
        base_url: Base URL for 2Captcha API. Defaults to "https://2captcha.com".
        timeout: HTTP request timeout in seconds. Defaults to 30.0.
        default_polling_timeout: Default wait time in seconds for resolution. Defaults to 120.0.
        default_polling_interval: Default polling interval in seconds. Defaults to 5.0.

    Examples:
        >>> from twocaptcha import TwoCaptchaClient
        >>> client = TwoCaptchaClient(api_key="your_api_key")
        >>> balance = client.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://2captcha.com",
        timeout: float = 30.0,
        default_polling_timeout: float = 120.0,
        default_polling_interval: float = 5.0,
    ) -> None:
        if not api_key:
            raise TwoCaptchaError("API key is required", code="MISSING_API_KEY")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.default_polling_timeout = default_polling_timeout
        self.default_polling_interval = default_polling_interval
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "TwoCaptchaClient":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def get_balance(self) -> float:
        """Retrieves account balance in USD.

        Returns:
            Current balance as a float.

        Examples:
            >>> balance = client.get_balance()
            >>> print(balance)
            12.50
        """
        data = self._query_result({"action": "getbalance"})
        try:
            return float(data)
        except (ValueError, TypeError) as exc:
            raise TwoCaptchaError(f"Failed to parse balance: {data}", code="PARSE_ERROR") from exc

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
        """Solves a normal image captcha from base64 data.

        Args:
            body: Base64-encoded image string.
            phrase: 0 = single word, 1 = multiple words.
            regsense: 0 = case-insensitive, 1 = case-sensitive.
            numeric: 0 = any, 1 = digits only, 2 = letters only, 3 = alphanumeric.
            calc: 0 = normal, 1 = math operation.
            min_len: Minimum text length.
            max_len: Maximum text length.
            language: Language flag (0 = all, 1 = Cyrillic, 2 = Latin).
            textinstructions: Optional instructions text for workers.

        Returns:
            Recognized captcha text solution.

        Examples:
            >>> text = client.solve_image(body="iVBORw0KGgoAAA...")
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
        """Solves a question-based text captcha.

        Args:
            text: Question text.
            language: Language flag (0 = all, 1 = Cyrillic, 2 = Latin).

        Returns:
            Answer to the question.

        Examples:
            >>> ans = client.solve_text("If tomorrow is Saturday, what day is today?")
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
        enterprise: bool = False,
    ) -> str:
        """Solves Google reCAPTCHA v2.

        Args:
            googlekey: Sitekey string.
            pageurl: Full URL of target page.
            invisible: True for invisible reCAPTCHA.
            data_s: Optional data-s token parameter.
            enterprise: True for reCAPTCHA Enterprise.

        Returns:
            g-recaptcha-response token string.

        Examples:
            >>> token = client.solve_recaptcha_v2("6Le-wvkSAAAA...", "https://example.com")
        """
        params: dict[str, Any] = {
            "method": "userrecaptcha",
            "googlekey": googlekey,
            "pageurl": pageurl,
        }
        if invisible:
            params["invisible"] = 1
        if data_s is not None:
            params["data-s"] = data_s
        if enterprise:
            params["enterprise"] = 1
        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_recaptcha_v3(
        self,
        googlekey: str,
        pageurl: str,
        action: str | None = None,
        min_score: float | None = None,
    ) -> str:
        """Solves Google reCAPTCHA v3.

        Args:
            googlekey: Sitekey string.
            pageurl: Full URL of target page.
            action: Widget action parameter.
            min_score: Minimum required score (0.1 to 0.9).

        Returns:
            Token string.

        Examples:
            >>> token = client.solve_recaptcha_v3("6LdyC2cUAAAA...", "https://example.com")
        """
        params: dict[str, Any] = {
            "method": "userrecaptcha",
            "version": "v3",
            "googlekey": googlekey,
            "pageurl": pageurl,
        }
        if action is not None:
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
    ) -> str:
        """Solves Cloudflare Turnstile.

        Args:
            sitekey: Turnstile sitekey.
            pageurl: Target page URL.
            action: Optional action string.
            data: Optional cData payload string.

        Returns:
            Turnstile verification token.

        Examples:
            >>> token = client.solve_turnstile("0x4AAAA...", "https://example.com")
        """
        params: dict[str, Any] = {
            "method": "turnstile",
            "sitekey": sitekey,
            "pageurl": pageurl,
        }
        if action is not None:
            params["action"] = action
        if data is not None:
            params["data"] = data
        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_hcaptcha(
        self,
        sitekey: str,
        pageurl: str,
        invisible: bool = False,
        data: str | None = None,
    ) -> str:
        """Solves hCaptcha.

        Args:
            sitekey: Target hCaptcha sitekey.
            pageurl: Target page URL.
            invisible: True for invisible hCaptcha.
            data: Custom rqdata string if required.

        Returns:
            hCaptcha response token.

        Examples:
            >>> token = client.solve_hcaptcha("4c672d35-...", "https://example.com")
        """
        params: dict[str, Any] = {
            "method": "hcaptcha",
            "sitekey": sitekey,
            "pageurl": pageurl,
        }
        if invisible:
            params["invisible"] = 1
        if data is not None:
            params["data"] = data
        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_funcaptcha(
        self,
        publickey: str,
        pageurl: str,
        surl: str | None = None,
        data: str | None = None,
    ) -> str:
        """Solves Arkose Labs FunCaptcha.

        Args:
            publickey: Public key string.
            pageurl: Full page URL.
            surl: FunCaptcha service URL.
            data: Custom payload data string.

        Returns:
            FunCaptcha resolution token.

        Examples:
            >>> token = client.solve_funcaptcha("69A21A01-...", "https://example.com")
        """
        params: dict[str, Any] = {
            "method": "funcaptcha",
            "publickey": publickey,
            "pageurl": pageurl,
        }
        if surl is not None:
            params["surl"] = surl
        if data is not None:
            params["data"] = data
        task_id = self.create_task(params)
        return self.wait_for_result(task_id)

    def solve_geetest(
        self,
        gt: str,
        challenge: str,
        pageurl: str,
        api_server: str | None = None,
    ) -> GeeTestResult:
        """Solves GeeTest v3.

        Args:
            gt: GeeTest gt key.
            challenge: GeeTest challenge string.
            pageurl: Target page URL.
            api_server: Optional api_server subdomain.

        Returns:
            GeeTestResult with challenge, validate, and seccode.

        Examples:
            >>> res = client.solve_geetest("gt_key", "challenge_str", "https://example.com")
        """
        params: dict[str, Any] = {
            "method": "geetest",
            "gt": gt,
            "challenge": challenge,
            "pageurl": pageurl,
        }
        if api_server is not None:
            params["api_server"] = api_server
        task_id = self.create_task(params)
        raw = self.wait_for_result(task_id)
        try:
            parsed = json.loads(raw)
            return GeeTestResult(
                challenge=str(parsed.get("geetest_challenge") or parsed.get("challenge", "")),
                validate=str(parsed.get("geetest_validate") or parsed.get("validate", raw)),
                seccode=str(parsed.get("geetest_seccode") or parsed.get("seccode", "")),
            )
        except Exception:
            return GeeTestResult(challenge="", validate=raw, seccode=f"{raw}|jordan")

    def create_task(self, params: dict[str, Any]) -> str:
        """Submits a raw task to /in.php.

        Args:
            params: Task parameters dictionary.

        Returns:
            Assigned task ID string.

        Examples:
            >>> task_id = client.create_task({"method": "userrecaptcha", ...})
        """
        payload: dict[str, Any] = {
            "key": self.api_key,
            "soft_id": DEFAULT_SOFT_ID,
            "json": 1,
            **params,
        }

        try:
            resp = self._client.post("/in.php", params=payload)
        except httpx.RequestError as exc:
            raise TwoCaptchaError(f"Network error: {exc}", code="NETWORK_ERROR") from exc

        try:
            data = resp.json()
        except Exception as exc:
            raise TwoCaptchaError(f"Invalid JSON: {resp.text}", code="INVALID_RESPONSE") from exc

        if isinstance(data, dict):
            status = data.get("status")
            req = data.get("request")
            if status == 1 and req:
                return str(req)
            if status == 0 and req:
                raise TwoCaptchaError(f"2Captcha error: {req}", code=str(req), response_data=data)

        msg = f"Unexpected response: {data}"
        raise TwoCaptchaError(msg, code="INVALID_RESPONSE", response_data=data)

    def get_task_result(self, task_id: str) -> str | None:
        """Checks status of a task without blocking.

        Args:
            task_id: Task ID.

        Returns:
            Solution string or None if still solving.

        Examples:
            >>> res = client.get_task_result("123456")
        """
        try:
            return self._query_result({"action": "get", "id": task_id})
        except TwoCaptchaError as exc:
            if exc.code == "CAPCHA_NOT_READY":
                return None
            raise

    def wait_for_result(
        self,
        task_id: str,
        timeout: float | None = None,
        interval: float | None = None,
    ) -> str:
        """Blocks and polls /res.php until the captcha is solved.

        Args:
            task_id: Task ID returned by create_task.
            timeout: Maximum seconds to wait.
            interval: Polling frequency in seconds.

        Returns:
            Solved token or text.

        Examples:
            >>> res = client.wait_for_result("123456")
        """
        max_time = timeout if timeout is not None else self.default_polling_timeout
        poll_interval = interval if interval is not None else self.default_polling_interval
        deadline = time.time() + max_time

        while time.time() < deadline:
            time.sleep(poll_interval)
            res = self.get_task_result(task_id)
            if res is not None:
                return res

        raise TwoCaptchaError(f"Timeout waiting for task {task_id}", code="TIMEOUT")

    def report_good(self, task_id: str) -> bool:
        """Reports a correctly solved captcha.

        Args:
            task_id: Task ID.

        Returns:
            True if report was accepted.

        Examples:
            >>> client.report_good("123456")
        """
        self._query_result({"action": "reportgood", "id": task_id})
        return True

    def report_bad(self, task_id: str) -> bool:
        """Reports an incorrectly solved captcha.

        Args:
            task_id: Task ID.

        Returns:
            True if report was accepted.

        Examples:
            >>> client.report_bad("123456")
        """
        self._query_result({"action": "reportbad", "id": task_id})
        return True

    def _query_result(self, params: dict[str, Any]) -> str:
        payload: dict[str, Any] = {
            "key": self.api_key,
            "json": 1,
            **params,
        }
        try:
            resp = self._client.get("/res.php", params=payload)
        except httpx.RequestError as exc:
            raise TwoCaptchaError(f"Network error: {exc}", code="NETWORK_ERROR") from exc

        try:
            data = resp.json()
        except Exception as exc:
            raise TwoCaptchaError(f"Invalid JSON: {resp.text}", code="INVALID_RESPONSE") from exc

        if isinstance(data, dict):
            status = data.get("status")
            req = data.get("request")
            if status == 1 and req is not None:
                return str(req)
            if status == 0 and req:
                raise TwoCaptchaError(f"2Captcha error: {req}", code=str(req), response_data=data)

        msg = f"Unexpected response: {data}"
        raise TwoCaptchaError(msg, code="INVALID_RESPONSE", response_data=data)


TwoCaptcha = TwoCaptchaClient
