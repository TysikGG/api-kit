"""Asynchronous Cap.guru client.

Methods match :class:`capguru.client.CapGuruClient`. Each call runs the sync
client in a worker thread so the event loop is not blocked, and the same
``softguru`` attribution, retries, and parsers apply.
"""

from __future__ import annotations

import asyncio
from typing import Any

from capguru.client import CapGuruClient, PollCallback, StopCallback
from capguru.types import ClickSolution, GeeTestResult, JsonTaskResult


class AsyncCapGuruClient:
    """Async counterpart of :class:`CapGuruClient`.

    Construct it with the same arguments. Use it as an async context manager::

        async with AsyncCapGuruClient(api_key) as client:
            balance = await client.get_balance()
    """

    def __init__(self, api_key: str, *args: Any, **kwargs: Any) -> None:
        self._sync = CapGuruClient(api_key, *args, **kwargs)

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await asyncio.to_thread(self._sync.close)

    async def __aenter__(self) -> AsyncCapGuruClient:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()

    async def get_balance(self) -> float:
        """Return the account balance."""
        return await asyncio.to_thread(self._sync.get_balance)

    async def balance(self) -> float:
        """Alias of :meth:`get_balance`."""
        return await asyncio.to_thread(self._sync.balance)

    async def solve_image(
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
        return await asyncio.to_thread(
            self._sync.solve_image,
            body,
            phrase,
            regsense,
            numeric,
            calc,
            min_len,
            max_len,
            language,
            textinstructions,
            vernet,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_image_file(
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
        return await asyncio.to_thread(
            self._sync.solve_image_file,
            file,
            filename,
            phrase,
            regsense,
            numeric,
            calc,
            min_len,
            max_len,
            language,
            textinstructions,
            vernet,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_text(
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
        return await asyncio.to_thread(
            self._sync.solve_text,
            text,
            language,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_recaptcha_v2(
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
        return await asyncio.to_thread(
            self._sync.solve_recaptcha_v2,
            googlekey,
            pageurl,
            invisible,
            data_s,
            enterprise,
            cookies,
            user_agent,
            proxy,
            proxy_type,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_recaptcha_v3(
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
        return await asyncio.to_thread(
            self._sync.solve_recaptcha_v3,
            googlekey,
            pageurl,
            action,
            min_score,
            enterprise,
            cookies,
            user_agent,
            proxy,
            proxy_type,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_turnstile(
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
        return await asyncio.to_thread(
            self._sync.solve_turnstile,
            sitekey,
            pageurl,
            action,
            data,
            cookies,
            user_agent,
            proxy,
            proxy_type,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_hcaptcha(
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
        """Solve an hCaptcha token task."""
        return await asyncio.to_thread(
            self._sync.solve_hcaptcha,
            sitekey,
            pageurl,
            invisible,
            data,
            cookies,
            user_agent,
            proxy,
            proxy_type,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_funcaptcha(
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
        return await asyncio.to_thread(
            self._sync.solve_funcaptcha,
            publickey,
            pageurl,
            surl,
            data,
            cookies,
            user_agent,
            proxy,
            proxy_type,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_geetest(
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
        return await asyncio.to_thread(
            self._sync.solve_geetest,
            gt,
            challenge,
            pageurl,
            api_server,
            cookies,
            user_agent,
            proxy,
            proxy_type,
            extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_click(
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
        return await asyncio.to_thread(
            self._sync.solve_click,
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

    async def solve_coordinates(self, *args: Any, **kwargs: Any) -> ClickSolution:
        """Alias of :meth:`solve_click`."""
        return await asyncio.to_thread(self._sync.solve_coordinates, *args, **kwargs)

    async def solve_recaptcha_click(
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
        return await asyncio.to_thread(
            self._sync.solve_recaptcha_click,
            textinstructions,
            body,
            grid=grid,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_hcaptcha_click(
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
        return await asyncio.to_thread(
            self._sync.solve_hcaptcha_click,
            textinstructions,
            body,
            grid=grid,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_funcaptcha_click(
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
        return await asyncio.to_thread(
            self._sync.solve_funcaptcha_click,
            textinstructions,
            body,
            grid=grid,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_geetest_click(
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
        return await asyncio.to_thread(
            self._sync.solve_geetest_click,
            textinstructions,
            body,
            grid=grid,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_binance(
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
        return await asyncio.to_thread(
            self._sync.solve_binance,
            body,
            object_name=object_name,
            textinstructions=textinstructions,
            grid=grid,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_tiktok(
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
        return await asyncio.to_thread(
            self._sync.solve_tiktok,
            variant=variant,
            question=question,
            body=body,
            body0=body0,
            body1=body1,
            textinstructions=textinstructions,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_aws(
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
        return await asyncio.to_thread(
            self._sync.solve_aws,
            body,
            instruction=instruction,
            textinstructions=textinstructions,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_temu(
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
        return await asyncio.to_thread(
            self._sync.solve_temu,
            textinstructions,
            body,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_slider(
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
        return await asyncio.to_thread(
            self._sync.solve_slider,
            body,
            piece=piece,
            body0=body0,
            body1=body1,
            textinstructions=textinstructions,
            click=click,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_bitget(
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
        return await asyncio.to_thread(
            self._sync.solve_bitget,
            body,
            textinstructions=textinstructions,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_linkvertise(
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
        return await asyncio.to_thread(
            self._sync.solve_linkvertise,
            instruction,
            body,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_seofast(
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
        return await asyncio.to_thread(
            self._sync.solve_seofast,
            instruction,
            body,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def solve_worldcash(
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
        return await asyncio.to_thread(
            self._sync.solve_worldcash,
            body,
            textinstructions=textinstructions,
            body0=body0,
            body1=body1,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )

    async def create_task(self, params: dict[str, Any]) -> str:
        """Submit a raw ``/in.php`` task. ``key``, ``json`` and ``softguru`` are forced."""
        return await asyncio.to_thread(self._sync.create_task, params)

    async def create_task_multipart(
        self,
        params: dict[str, Any],
        file: bytes,
        filename: str = "captcha.png",
        file_field: str = "file",
    ) -> str:
        """Submit ``method=post`` as multipart."""
        return await asyncio.to_thread(
            self._sync.create_task_multipart, params, file, filename, file_field
        )

    async def get_task_result(self, task_id: str) -> str | None:
        """Return the solution, or ``None`` while the task is ``CAPCHA_NOT_READY``."""
        return await asyncio.to_thread(self._sync.get_task_result, task_id)

    async def wait_for_result(
        self,
        task_id: str,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> str:
        """Poll ``/res.php`` until the task is solved or the timeout elapses."""
        return await asyncio.to_thread(
            self._sync.wait_for_result, task_id, timeout, interval, on_not_ready, should_stop
        )

    async def report_good(self, task_id: str) -> bool:
        """Report a correct solution (``action=reportgood``)."""
        return await asyncio.to_thread(self._sync.report_good, task_id)

    async def report_correct(self, task_id: str) -> bool:
        """Alias of :meth:`report_good`."""
        return await asyncio.to_thread(self._sync.report_correct, task_id)

    async def report_bad(self, task_id: str) -> bool:
        """Report an incorrect solution (``action=reportbad``)."""
        return await asyncio.to_thread(self._sync.report_bad, task_id)

    async def report_incorrect(self, task_id: str) -> bool:
        """Alias of :meth:`report_bad`."""
        return await asyncio.to_thread(self._sync.report_incorrect, task_id)

    async def create_json_task(
        self,
        task: dict[str, Any],
        *,
        language_pool: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> str:
        """Anti-Captcha compatible ``POST /createTask``."""
        return await asyncio.to_thread(
            self._sync.create_json_task, task, language_pool=language_pool, extra=extra
        )

    async def get_json_task_result(self, task_id: str) -> JsonTaskResult | None:
        """Anti-Captcha compatible ``POST /getTaskResult``. ``None`` while processing."""
        return await asyncio.to_thread(self._sync.get_json_task_result, task_id)

    async def wait_for_json_result(
        self,
        task_id: str,
        timeout: float | None = None,
        interval: float | None = None,
        on_not_ready: PollCallback | None = None,
        should_stop: StopCallback | None = None,
    ) -> JsonTaskResult:
        """Poll ``/getTaskResult`` until the JSON task is ready."""
        return await asyncio.to_thread(
            self._sync.wait_for_json_result, task_id, timeout, interval, on_not_ready, should_stop
        )

    async def solve_json_task(
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
        return await asyncio.to_thread(
            self._sync.solve_json_task,
            task,
            language_pool=language_pool,
            extra=extra,
            timeout=timeout,
            interval=interval,
            on_not_ready=on_not_ready,
            should_stop=should_stop,
        )


AsyncCapGuru = AsyncCapGuruClient
