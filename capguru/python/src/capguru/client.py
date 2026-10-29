"""Synchronous Cap.guru client."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

import httpx

from capguru.constants import CLICK, DEFAULT_SOFTGURU, TEXT_INSTRUCTIONS
from capguru.errors import RETRYABLE_ERROR_CODES, CapGuruError, capguru_error
from capguru.params import (
    aws_params,
    binance_params,
    click_params,
    funcaptcha_params,
    geetest_params,
    hcaptcha_params,
    image_file_params,
    image_params,
    prefixed_params,
    recaptcha_v2_params,
    recaptcha_v3_params,
    slider_params,
    temu_params,
    text_params,
    tiktok_params,
    turnstile_params,
)
from capguru.parse import (
    parse_click_answer,
    parse_geetest,
    raise_for_http,
    read_json_task_id,
    read_json_task_result,
    read_solution,
    read_task_id,
)
from capguru.types import ClickSolution, GeeTestResult, JsonTaskResult

PollCallback = Callable[[dict[str, Any]], None]
StopCallback = Callable[[], bool]


class CapGuruClient:
    """Client for the Cap.guru solving API.

    Supports the RuCaptcha-compatible ``/in.php`` and ``/res.php`` endpoints and
    the Anti-Captcha compatible ``/createTask`` and ``/getTaskResult`` endpoints.

    ``softguru`` is always sent as :data:`capguru.constants.DEFAULT_SOFTGURU`.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.cap.guru",
        timeout: float = 30.0,
        default_polling_timeout: float = 120.0,
        default_polling_interval: float = 5.0,
        *,
        max_retries: int = 0,
        retry_delay: float = 0.0,
        headers: dict[str, str] | None = None,
    ) -> None:
        if not api_key:
            raise capguru_error("API key is required", code="MISSING_API_KEY")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.default_polling_timeout = default_polling_timeout
        self.default_polling_interval = default_polling_interval
        self.max_retries = max(0, max_retries)
        self.retry_delay = max(0.0, retry_delay)
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout, headers=headers)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> CapGuruClient:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def get_balance(self) -> float:
        """Return the account balance."""
        data = self._query({"action": "getbalance"})
        try:
            return float(data)
        except (TypeError, ValueError) as exc:
            raise capguru_error(
                f"Failed to parse balance: {data}", code="PARSE_ERROR", response_data=data
            ) from exc

    def balance(self) -> float:
        """Alias of :meth:`get_balance`."""
        return self.get_balance()

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
        vernet: int | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Solve a base64 image captcha."""
        params = image_params(
            body,
            phrase=phrase,
            regsense=regsense,
            numeric=numeric,
            calc=calc,
            min_len=min_len,
            max_len=max_len,
            language=language,
            textinstructions=textinstructions,
            vernet=vernet,
            extra=extra,
        )
        return self._solve(params, timeout, interval, on_not_ready, should_stop)

    def solve_image_file(
        self,
        file: bytes,
        filename: str = "captcha.png",
        phrase: int | None = None,
        regsense: int | None = None,
        numeric: int | None = None,
        calc: int | None = None,
        min_len: int | None = None,
        max_len: int | None = None,
        language: int | None = None,
        textinstructions: str | None = None,
        vernet: int | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Solve an image uploaded as multipart form data (``method=post``)."""
        params = image_file_params(
            phrase=phrase,
            regsense=regsense,
            numeric=numeric,
            calc=calc,
            min_len=min_len,
            max_len=max_len,
            language=language,
            textinstructions=textinstructions,
            vernet=vernet,
            extra=extra,
        )
        task_id = self.create_task_multipart(params, file, filename)
        return self.wait_for_result(task_id, timeout, interval, on_not_ready, should_stop)

    def solve_text(
        self,
        text: str,
        language: int | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Answer a text question."""
        return self._solve(
            text_params(text, language=language, extra=extra),
            timeout,
            interval,
            on_not_ready,
            should_stop,
        )

    def solve_recaptcha_v2(
        self,
        googlekey: str,
        pageurl: str,
        invisible: bool = False,
        data_s: str | None = None,
        enterprise: bool = False,
        cookies: str | None = None,
        user_agent: str | None = None,
        proxy: str | None = None,
        proxy_type: str | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Solve reCAPTCHA v2 and return the ``g-recaptcha-response`` token."""
        params = recaptcha_v2_params(
            googlekey,
            pageurl,
            invisible=invisible,
            data_s=data_s,
            enterprise=enterprise,
            cookies=cookies,
            user_agent=user_agent,
            proxy=proxy,
            proxy_type=proxy_type,
            extra=extra,
        )
        return self._solve(params, timeout, interval, on_not_ready, should_stop)

    def solve_recaptcha_v3(
        self,
        googlekey: str,
        pageurl: str,
        action: str | None = None,
        min_score: float | None = None,
        enterprise: bool = False,
        cookies: str | None = None,
        user_agent: str | None = None,
        proxy: str | None = None,
        proxy_type: str | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Solve reCAPTCHA v3 and return a token."""
        params = recaptcha_v3_params(
            googlekey,
            pageurl,
            action=action,
            min_score=min_score,
            enterprise=enterprise,
            cookies=cookies,
            user_agent=user_agent,
            proxy=proxy,
            proxy_type=proxy_type,
            extra=extra,
        )
        return self._solve(params, timeout, interval, on_not_ready, should_stop)

    def solve_turnstile(
        self,
        sitekey: str,
        pageurl: str,
        action: str | None = None,
        data: str | None = None,
        cookies: str | None = None,
        user_agent: str | None = None,
        proxy: str | None = None,
        proxy_type: str | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Solve Cloudflare Turnstile and return a token."""
        params = turnstile_params(
            sitekey,
            pageurl,
            action=action,
            data=data,
            cookies=cookies,
            user_agent=user_agent,
            proxy=proxy,
            proxy_type=proxy_type,
            extra=extra,
        )
        return self._solve(params, timeout, interval, on_not_ready, should_stop)

    def solve_hcaptcha(
        self,
        sitekey: str,
        pageurl: str,
        invisible: bool = False,
        data: str | None = None,
        cookies: str | None = None,
        user_agent: str | None = None,
        proxy: str | None = None,
        proxy_type: str | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Solve an hCaptcha token task.

        The service currently documents token solving as unavailable. Prefer
        :meth:`solve_hcaptcha_click`. This method remains for published parameters
        and existing callers.
        """
        params = hcaptcha_params(
            sitekey,
            pageurl,
            invisible=invisible,
            data=data,
            cookies=cookies,
            user_agent=user_agent,
            proxy=proxy,
            proxy_type=proxy_type,
            extra=extra,
        )
        return self._solve(params, timeout, interval, on_not_ready, should_stop)

    def solve_funcaptcha(
        self,
        publickey: str,
        pageurl: str,
        surl: str | None = None,
        data: str | None = None,
        cookies: str | None = None,
        user_agent: str | None = None,
        proxy: str | None = None,
        proxy_type: str | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Solve Arkose Labs FunCaptcha and return a token."""
        params = funcaptcha_params(
            publickey,
            pageurl,
            surl=surl,
            data=data,
            cookies=cookies,
            user_agent=user_agent,
            proxy=proxy,
            proxy_type=proxy_type,
            extra=extra,
        )
        return self._solve(params, timeout, interval, on_not_ready, should_stop)

    def solve_geetest(
        self,
        gt: str,
        challenge: str,
        pageurl: str,
        api_server: str | None = None,
        cookies: str | None = None,
        user_agent: str | None = None,
        proxy: str | None = None,
        proxy_type: str | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> GeeTestResult:
        """Solve GeeTest v3 and return challenge, validate, and seccode."""
        params = geetest_params(
            gt,
            challenge,
            pageurl,
            api_server=api_server,
            cookies=cookies,
            user_agent=user_agent,
            proxy=proxy,
            proxy_type=proxy_type,
            extra=extra,
        )
        raw = self._solve(params, timeout, interval, on_not_ready, should_stop)
        return parse_geetest(raw)

    def solve_click(
        self,
        textinstructions: str,
        click: str,
        body: str | None = None,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """Solve a generic image-click or slider task."""
        params = click_params(
            textinstructions, click, body=body, body0=body0, body1=body1, extra=extra
        )
        raw = self._solve(params, timeout, interval, on_not_ready, should_stop)
        return parse_click_answer(raw)

    def solve_coordinates(self, *args: Any, **kwargs: Any) -> ClickSolution:
        """Alias of :meth:`solve_click`."""
        return self.solve_click(*args, **kwargs)

    def solve_recaptcha_click(
        self,
        textinstructions: str,
        body: str | None = None,
        *,
        grid: bool = False,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """reCAPTCHA image click. ``grid=True`` requests cell numbers."""
        click = CLICK["RECAPTCHA_GRID"] if grid else CLICK["RECAPTCHA"]
        return self.solve_click(
            textinstructions,
            click,
            body,
            body0,
            body1,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    def solve_hcaptcha_click(
        self,
        textinstructions: str,
        body: str | None = None,
        *,
        grid: bool = False,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """hCaptcha image click. ``grid=True`` requests cell numbers."""
        click = CLICK["HCAPTCHA_GRID"] if grid else CLICK["HCAPTCHA"]
        return self.solve_click(
            textinstructions,
            click,
            body,
            body0,
            body1,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    def solve_funcaptcha_click(
        self,
        textinstructions: str,
        body: str | None = None,
        *,
        grid: bool = False,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """FunCaptcha image click. ``grid=True`` requests cell numbers."""
        click = CLICK["FUNCAPTCHA_GRID"] if grid else CLICK["FUNCAPTCHA"]
        return self.solve_click(
            textinstructions,
            click,
            body,
            body0,
            body1,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    def solve_geetest_click(
        self,
        textinstructions: str,
        body: str | None = None,
        *,
        grid: bool = False,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """GeeTest image click or slider. ``grid=True`` uses ``click=geetest2``."""
        click = CLICK["GEETEST_GRID"] if grid else CLICK["GEETEST"]
        return self.solve_click(
            textinstructions,
            click,
            body,
            body0,
            body1,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    def solve_binance(
        self,
        body: str | None = None,
        *,
        object_name: str | None = None,
        textinstructions: str | None = None,
        grid: bool = False,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """Binance object click. ``object_name='dog'`` is sent as ``binance,dog``."""
        params = binance_params(
            body=body,
            body0=body0,
            body1=body1,
            object_name=object_name,
            textinstructions=textinstructions,
            grid=grid,
            extra=extra,
        )
        return parse_click_answer(self._solve(params, timeout, interval, on_not_ready, should_stop))

    def solve_tiktok(
        self,
        *,
        variant: str = "slider",
        question: str | None = None,
        body: str | None = None,
        body0: str | None = None,
        body1: str | None = None,
        textinstructions: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """TikTok slider, koleso/kolesso pair, abc, or abc question."""
        params = tiktok_params(
            variant=variant,
            question=question,
            body=body,
            body0=body0,
            body1=body1,
            textinstructions=textinstructions,
            extra=extra,
        )
        return parse_click_answer(self._solve(params, timeout, interval, on_not_ready, should_stop))

    def solve_aws(
        self,
        body: str | None = None,
        *,
        instruction: str | None = None,
        textinstructions: str | None = None,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """AWS WAF / Amazon image or slider (``click=oth``)."""
        params = aws_params(
            body=body,
            body0=body0,
            body1=body1,
            instruction=instruction,
            textinstructions=textinstructions,
            extra=extra,
        )
        return parse_click_answer(self._solve(params, timeout, interval, on_not_ready, should_stop))

    def solve_temu(
        self,
        textinstructions: str,
        body: str | None = None,
        *,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """Temu image click (``click=temu``)."""
        params = temu_params(textinstructions, body=body, body0=body0, body1=body1, extra=extra)
        return parse_click_answer(self._solve(params, timeout, interval, on_not_ready, should_stop))

    def solve_slider(
        self,
        body: str | None = None,
        *,
        piece: str | None = None,
        body0: str | None = None,
        body1: str | None = None,
        textinstructions: str | None = None,
        click: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """Slider / puzzle. A ``piece`` is sent as ``body1`` with the background in ``body0``."""
        params = slider_params(
            body=body,
            piece=piece,
            body0=body0,
            body1=body1,
            textinstructions=textinstructions,
            click=click,
            extra=extra,
        )
        return parse_click_answer(self._solve(params, timeout, interval, on_not_ready, should_stop))

    def solve_bitget(
        self,
        body: str | None = None,
        *,
        textinstructions: str | None = None,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """Bitget icon captcha (``geetesticonhand``)."""
        return self.solve_click(
            textinstructions or TEXT_INSTRUCTIONS["BITGET"],
            CLICK["GEETEST"],
            body,
            body0,
            body1,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    def solve_linkvertise(
        self,
        instruction: str,
        body: str | None = None,
        *,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """Linkvertise click (``custom1221,<instruction>``)."""
        params = prefixed_params(
            TEXT_INSTRUCTIONS["LINKVERTISE_PREFIX"],
            instruction,
            body=body,
            body0=body0,
            body1=body1,
            extra=extra,
        )
        return parse_click_answer(self._solve(params, timeout, interval, on_not_ready, should_stop))

    def solve_seofast(
        self,
        instruction: str,
        body: str | None = None,
        *,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """SeoFast / Profitcentr / Seotime (``custom1222,<instruction>``)."""
        params = prefixed_params(
            TEXT_INSTRUCTIONS["SEOFAST_PREFIX"],
            instruction,
            body=body,
            body0=body0,
            body1=body1,
            extra=extra,
        )
        return parse_click_answer(self._solve(params, timeout, interval, on_not_ready, should_stop))

    def solve_worldcash(
        self,
        body: str | None = None,
        *,
        textinstructions: str | None = None,
        body0: str | None = None,
        body1: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> ClickSolution:
        """World.cash (``textinstructions=custom1224``)."""
        return self.solve_click(
            textinstructions or TEXT_INSTRUCTIONS["WORLDCASH"],
            CLICK["OTHER"],
            body,
            body0,
            body1,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    def create_task(self, params: dict[str, Any]) -> str:
        """Submit a raw ``/in.php`` task. ``key``, ``json`` and ``softguru`` are forced."""
        payload = self._envelope(params)

        def attempt() -> str:
            data = self._request("POST", "/in.php", params=payload)
            return read_task_id(data)

        return self._with_retries(attempt)

    def create_task_multipart(
        self,
        params: dict[str, Any],
        file: bytes,
        filename: str = "captcha.png",
        file_field: str = "file",
    ) -> str:
        """Submit ``method=post`` as multipart."""
        payload = {
            key: str(value) for key, value in self._envelope(params).items() if value is not None
        }
        files = {file_field: (filename, file, "application/octet-stream")}

        def attempt() -> str:
            data = self._request("POST", "/in.php", data=payload, files=files)
            return read_task_id(data)

        return self._with_retries(attempt)

    def get_task_result(self, task_id: str) -> str | None:
        """Return the solution, or ``None`` while the task is ``CAPCHA_NOT_READY``."""
        try:
            return self._query({"action": "get", "id": task_id})
        except CapGuruError as exc:
            if exc.code == "CAPCHA_NOT_READY":
                return None
            raise

    def wait_for_result(
        self,
        task_id: str,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Poll ``/res.php`` until the task is solved or the timeout elapses."""
        return self._poll(task_id, timeout, interval, on_not_ready, should_stop, json_api=False)

    def report_good(self, task_id: str) -> bool:
        """Report a correct solution (``action=reportgood``)."""
        self._query({"action": "reportgood", "id": task_id})
        return True

    def report_correct(self, task_id: str) -> bool:
        """Alias of :meth:`report_good`."""
        return self.report_good(task_id)

    def report_bad(self, task_id: str) -> bool:
        """Report an incorrect solution (``action=reportbad``)."""
        self._query({"action": "reportbad", "id": task_id})
        return True

    def report_incorrect(self, task_id: str) -> bool:
        """Alias of :meth:`report_bad`."""
        return self.report_bad(task_id)

    def create_json_task(
        self,
        task: dict[str, Any],
        *,
        language_pool: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> str:
        """Anti-Captcha compatible ``POST /createTask``."""
        body: dict[str, Any] = {**(extra or {}), "clientKey": self.api_key, "task": task}
        if language_pool:
            body["languagePool"] = language_pool
        body["softId"] = DEFAULT_SOFTGURU
        body["softguru"] = DEFAULT_SOFTGURU

        def attempt() -> str:
            data = self._request("POST", "/createTask", json=body)
            return read_json_task_id(data)

        return self._with_retries(attempt)

    def get_json_task_result(self, task_id: str) -> JsonTaskResult | None:
        """Anti-Captcha compatible ``POST /getTaskResult``. ``None`` while processing."""

        def attempt() -> JsonTaskResult | None:
            data = self._request(
                "POST", "/getTaskResult", json={"clientKey": self.api_key, "taskId": task_id}
            )
            return read_json_task_result(task_id, data)

        return self._with_retries(attempt)

    def wait_for_json_result(
        self,
        task_id: str,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> JsonTaskResult:
        """Poll ``/getTaskResult`` until the JSON task is ready."""
        result = self._poll(task_id, timeout, interval, on_not_ready, should_stop, json_api=True)
        assert isinstance(result, JsonTaskResult)
        return result

    def solve_json_task(
        self,
        task: dict[str, Any],
        *,
        language_pool: str | None = None,
        extra: dict[str, Any] | None = None,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> JsonTaskResult:
        """Create a JSON task and wait for its solution."""
        task_id = self.create_json_task(task, language_pool=language_pool, extra=extra)
        return self.wait_for_json_result(task_id, timeout, interval, on_not_ready, should_stop)

    def _solve(
        self,
        params: dict[str, Any],
        timeout: float | None,
        interval: float | None,
        on_not_ready: PollCallback | None,
        should_stop: StopCallback | None,
    ) -> str:
        task_id = self.create_task(params)
        return self.wait_for_result(task_id, timeout, interval, on_not_ready, should_stop)

    def _poll(
        self,
        task_id: str,
        timeout: float | None,
        interval: float | None,
        on_not_ready: PollCallback | None,
        should_stop: StopCallback | None,
        *,
        json_api: bool,
    ) -> str | JsonTaskResult:
        max_time = self.default_polling_timeout if timeout is None else timeout
        poll = self.default_polling_interval if interval is None else interval
        started = time.monotonic()
        deadline = started + max_time
        attempt = 0
        while True:
            if should_stop and should_stop():
                raise capguru_error("Polling aborted", code="ABORTED")
            attempt += 1
            result = (
                self.get_json_task_result(task_id) if json_api else self.get_task_result(task_id)
            )
            if result is not None:
                return result
            if on_not_ready:
                on_not_ready(
                    {"task_id": task_id, "attempt": attempt, "elapsed": time.monotonic() - started}
                )
            if should_stop and should_stop():
                raise capguru_error("Polling aborted", code="ABORTED")
            if time.monotonic() >= deadline:
                raise capguru_error(f"Timeout waiting for task {task_id}", code="TIMEOUT")
            remaining = max(0.0, deadline - time.monotonic())
            time.sleep(min(poll, remaining))
            if should_stop and should_stop():
                raise capguru_error("Polling aborted", code="ABORTED")

    def _query(self, params: dict[str, Any]) -> str:
        payload = {"key": self.api_key, "json": 1, **params}

        def attempt() -> str:
            data = self._request("GET", "/res.php", params=payload)
            return read_solution(data)

        return self._with_retries(attempt)

    def _envelope(self, params: dict[str, Any]) -> dict[str, Any]:
        payload = {key: value for key, value in params.items() if value is not None}
        payload["key"] = self.api_key
        payload["json"] = 1
        payload["softguru"] = DEFAULT_SOFTGURU
        return payload

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
    ) -> Any:
        try:
            response = self._client.request(
                method, path, params=params, json=json, data=data, files=files
            )
        except httpx.RequestError as exc:
            raise capguru_error(f"{path} request failed: {exc}", code="NETWORK_ERROR") from exc
        decoded = _decode(response)
        return raise_for_http(response.status_code, decoded)

    def _with_retries(self, fn: Callable[[], Any]) -> Any:
        attempts = self.max_retries + 1
        attempt = 0
        while True:
            try:
                return fn()
            except CapGuruError as exc:
                attempt += 1
                retryable = exc.code in RETRYABLE_ERROR_CODES
                if not retryable or attempt >= attempts:
                    raise
                if self.retry_delay > 0:
                    time.sleep(self.retry_delay)


def _decode(response: httpx.Response) -> Any:
    text = response.text
    stripped = text.lstrip()
    content_type = response.headers.get("content-type", "")
    if "json" in content_type or stripped.startswith("{") or stripped.startswith("["):
        try:
            return response.json()
        except Exception as exc:
            raise capguru_error(f"Invalid JSON: {text}", code="INVALID_RESPONSE") from exc
    return text


CapGuru = CapGuruClient
