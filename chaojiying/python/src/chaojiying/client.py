"""Synchronous and asynchronous Chaojiying clients."""

from __future__ import annotations

import asyncio
import os
import time
from typing import Any

import httpx

from .errors import ChaojiyingError, MissingCredentialsError, NetworkError
from .errors import TimeoutError as RequestTimeoutError
from .protocol import (
    REPORT_PATH,
    SCORE_PATH,
    Call,
    Session,
    build_free_call,
    build_recognize_call,
    hash_password,
    interpret_response,
    is_retryable,
    shape_recognize,
    shape_report,
    shape_score,
)
from .types import RecognizeResult, ReportErrorResult, ScoreResult

SOFT_ID = "984642"
SOFT_KEY = "369fe52d5cdbb147892a40ac78f13e60"
_DEFAULT_BASE = "https://upload.chaojiying.net"
_DEFAULT_FREE_BASE = "https://api.chaojiying.com"
_USER_AGENT = "chaojiying-client/0.1.0"


def _session_from_env(
    username: str | None,
    password: str | None,
    *,
    soft_id: str | None,
    soft_key: str | None,
    access_token: str | None,
    api_key: str | None,
    retries: int,
    retry_delay: float,
) -> Session:
    user = username or os.environ.get("CHAOJIYING_USER")
    pwd = password or os.environ.get("CHAOJIYING_PASS")
    token = access_token or os.environ.get("CHAOJIYING_ACCESS_TOKEN") or None
    key = api_key or os.environ.get("CHAOJIYING_API_KEY") or None
    alternate_auth = bool(token or key)
    if not alternate_auth and not user:
        raise MissingCredentialsError("Chaojiying username is required.")
    if not alternate_auth and not pwd:
        raise MissingCredentialsError("Chaojiying password is required.")
    resolved_soft_id = soft_id or SOFT_ID
    resolved_soft_key = soft_key or (SOFT_KEY if resolved_soft_id == SOFT_ID else "")
    return Session(
        username=user or None,
        password_hash=hash_password(pwd) if pwd else None,
        access_token=token,
        api_key=key,
        soft_id=resolved_soft_id,
        soft_key=resolved_soft_key,
        retries=max(0, retries),
        retry_delay=retry_delay,
    )


def _client_kwargs(base_url: str, timeout: float, user_agent: str | None, proxy: str | None) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "base_url": base_url.rstrip("/"),
        "timeout": timeout,
        "headers": {
            "User-Agent": user_agent or _USER_AGENT,
            "Accept": "application/json",
        },
    }
    if proxy:
        kwargs["proxy"] = proxy
    return kwargs


def _decode(response: httpx.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except Exception:
        payload = None
    return interpret_response(response.status_code, payload)


def _map_transport(exc: httpx.RequestError) -> BaseException:
    """Map httpx transport errors. A bare TimeoutException is returned unchanged.

    pytest-httpx uses a bare TimeoutException when no mock matches. Real
    timeouts are ReadTimeout, ConnectTimeout, WriteTimeout, or PoolTimeout.
    """
    if isinstance(exc, httpx.TimeoutException):
        if type(exc) is httpx.TimeoutException:
            return exc
        return RequestTimeoutError(str(exc))
    return NetworkError(f"HTTP request failed: {exc}", connect_failure=True)


class _API:
    """Shared call builders. Transport lives on the concrete client."""

    session: Session

    def _score_call(self) -> Call:
        return Call(path=SCORE_PATH, policy="safe", data=dict(self.session.auth))

    def _report_call(self, pic_id: str) -> Call:
        if not pic_id:
            raise ChaojiyingError("pic_id is required.")
        data = {**self.session.auth, "softid": self.session.soft_id, "id": pic_id}
        return Call(path=REPORT_PATH, policy="paid", data=data)

    def _recognize_call(self, image: Any, code_type: int | str, **options: Any) -> Call:
        return build_recognize_call(self.session, image, code_type, **options)

    def _finish(
        self,
        data: dict[str, Any],
        code_type: int | str,
        verify_md5: bool,
        shape: str | None = None,
    ) -> RecognizeResult:
        return shape_recognize(
            data,
            code_type,
            verify_md5=verify_md5,
            session=self.session,
            shape=shape,
        )


class Chaojiying(_API):
    """Synchronous client for the Chaojiying (超级鹰) CAPTCHA recognition API.

    Paid calls go to ``upload.chaojiying.net``. Free OCR v2 goes to ``api.chaojiying.com``.
    Recognition is one HTTP request; the server holds the connection until it has an answer.
    """

    def __init__(
        self,
        username: str | None = None,
        password: str | None = None,
        base_url: str | None = None,
        timeout: float = 60.0,
        user_agent: str | None = None,
        *,
        proxy: str | None = None,
        retries: int = 2,
        retry_delay: float = 0.2,
        soft_id: str | None = None,
        soft_key: str | None = None,
        access_token: str | None = None,
        api_key: str | None = None,
        free_base_url: str | None = None,
    ) -> None:
        self.username = username or os.environ.get("CHAOJIYING_USER")
        self.base_url = (base_url or _DEFAULT_BASE).rstrip("/")
        self.free_base_url = (free_base_url or _DEFAULT_FREE_BASE).rstrip("/")
        self.proxy = proxy
        self.session = _session_from_env(
            username,
            password,
            soft_id=soft_id,
            soft_key=soft_key,
            access_token=access_token,
            api_key=api_key,
            retries=retries,
            retry_delay=retry_delay,
        )
        self.username = self.session.username or ""
        self.password_hash = self.session.password_hash or ""
        self._client = httpx.Client(**_client_kwargs(self.base_url, timeout, user_agent, proxy))
        self._free = httpx.Client(**_client_kwargs(self.free_base_url, timeout, user_agent, proxy))

    def close(self) -> None:
        """Closes the underlying HTTP client sessions."""
        self._client.close()
        self._free.close()

    def __enter__(self) -> Chaojiying:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def get_score(self) -> ScoreResult:
        """Retrieves user account remaining points (tifen) and locked points."""
        return shape_score(self._request(self._score_call()))

    def get_balance(self) -> ScoreResult:
        """Alias of :meth:`get_score`."""
        return self.get_score()

    def recognize(
        self,
        image: bytes | str | Any,
        code_type: int | str,
        str_debug: str | None = None,
        len_min: int | None = None,
        time_add: int | None = None,
        *,
        upload: str = "base64",
        filename: str = "captcha.jpg",
        verify_md5: bool = False,
        body_format: str = "form",
    ) -> RecognizeResult:
        """Recognizes a CAPTCHA image and returns the parsed result.

        ``image`` may be raw bytes, a binary file object, a base64 string, or a data URI.
        A response with ``err_no == 0`` is already billed.
        """
        call = self._recognize_call(
            image,
            code_type,
            str_debug=str_debug,
            len_min=len_min,
            time_add=time_add,
            upload=upload,
            filename=filename,
            body_format=body_format,
        )
        return self._finish(self._request(call), code_type, verify_md5)

    def post_pic(
        self,
        image: bytes | str | Any,
        code_type: int | str,
        str_debug: str | None = None,
        **options: Any,
    ) -> RecognizeResult:
        """Official sample name for a multipart ``userfile`` upload."""
        options["upload"] = "multipart"
        return self.recognize(image, code_type, str_debug, **options)

    def post_pic_base64(
        self,
        image: bytes | str | Any,
        code_type: int | str,
        str_debug: str | None = None,
        **options: Any,
    ) -> RecognizeResult:
        """Official sample name for a ``file_base64`` upload."""
        options["upload"] = "base64"
        return self.recognize(image, code_type, str_debug, **options)

    def recognize_file(self, file_path: str, code_type: int | str, **options: Any) -> RecognizeResult:
        """Read an image from disk and recognize it."""
        with open(file_path, "rb") as handle:
            return self.recognize(handle.read(), code_type, **options)

    def report_error(self, pic_id: str) -> ReportErrorResult:
        """Reports an incorrect CAPTCHA solution to request a point refund.

        Must be called within about three minutes, and only when the answer is known to be wrong.
        """
        return shape_report(self._request(self._report_call(pic_id)))

    def report(self, pic_id: str) -> ReportErrorResult:
        """Alias of :meth:`report_error`."""
        return self.report_error(pic_id)

    def recognize_free(
        self,
        image: bytes | str | Any,
        model: int | str,
        *,
        upload: str = "base64",
        filename: str = "captcha.jpg",
        api_key: str | None = None,
    ) -> RecognizeResult:
        """Free OCR v2. ``model`` is 6/calc, 8/text, or 9/blocks."""
        call, shape = build_free_call(
            self.session, image, model, upload=upload, filename=filename, api_key=api_key
        )
        return self._finish(self._request(call), model, False, shape)

    def _request(self, call: Call) -> dict[str, Any]:
        attempt = 0
        attempts = self.session.retries + 1
        while True:
            try:
                return self._send_once(call)
            except Exception as exc:
                attempt += 1
                if attempt >= attempts or not is_retryable(exc, call.policy):
                    raise
                delay = self.session.retry_delay * attempt
                if delay > 0:
                    time.sleep(delay)

    def _send_once(self, call: Call) -> dict[str, Any]:
        client = self._free if call.free else self._client
        try:
            response = client.post(
                call.path,
                data=call.data,
                json=call.json_body,
                files=call.files,
                params=call.params,
            )
        except httpx.RequestError as exc:
            mapped = _map_transport(exc)
            if mapped is exc:
                raise
            raise mapped from exc
        return _decode(response)


class AsyncChaojiying(_API):
    """Async client with the same methods as :class:`Chaojiying`."""

    def __init__(
        self,
        username: str | None = None,
        password: str | None = None,
        base_url: str | None = None,
        timeout: float = 60.0,
        user_agent: str | None = None,
        *,
        proxy: str | None = None,
        retries: int = 2,
        retry_delay: float = 0.2,
        soft_id: str | None = None,
        soft_key: str | None = None,
        access_token: str | None = None,
        api_key: str | None = None,
        free_base_url: str | None = None,
    ) -> None:
        self.username = username or os.environ.get("CHAOJIYING_USER") or ""
        self.base_url = (base_url or _DEFAULT_BASE).rstrip("/")
        self.free_base_url = (free_base_url or _DEFAULT_FREE_BASE).rstrip("/")
        self.proxy = proxy
        self.session = _session_from_env(
            username,
            password,
            soft_id=soft_id,
            soft_key=soft_key,
            access_token=access_token,
            api_key=api_key,
            retries=retries,
            retry_delay=retry_delay,
        )
        self.username = self.session.username or ""
        self.password_hash = self.session.password_hash or ""
        self._client = httpx.AsyncClient(**_client_kwargs(self.base_url, timeout, user_agent, proxy))
        self._free = httpx.AsyncClient(**_client_kwargs(self.free_base_url, timeout, user_agent, proxy))

    async def aclose(self) -> None:
        """Closes the underlying async HTTP client sessions."""
        await self._client.aclose()
        await self._free.aclose()

    async def __aenter__(self) -> AsyncChaojiying:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.aclose()

    async def get_score(self) -> ScoreResult:
        """Retrieves user account remaining points (tifen) and locked points."""
        return shape_score(await self._request(self._score_call()))

    async def get_balance(self) -> ScoreResult:
        """Alias of :meth:`get_score`."""
        return await self.get_score()

    async def recognize(
        self,
        image: bytes | str | Any,
        code_type: int | str,
        str_debug: str | None = None,
        len_min: int | None = None,
        time_add: int | None = None,
        *,
        upload: str = "base64",
        filename: str = "captcha.jpg",
        verify_md5: bool = False,
        body_format: str = "form",
    ) -> RecognizeResult:
        """Async form of :meth:`Chaojiying.recognize`."""
        call = self._recognize_call(
            image,
            code_type,
            str_debug=str_debug,
            len_min=len_min,
            time_add=time_add,
            upload=upload,
            filename=filename,
            body_format=body_format,
        )
        return self._finish(await self._request(call), code_type, verify_md5)

    async def post_pic(
        self,
        image: bytes | str | Any,
        code_type: int | str,
        str_debug: str | None = None,
        **options: Any,
    ) -> RecognizeResult:
        """Official sample name for a multipart ``userfile`` upload."""
        options["upload"] = "multipart"
        return await self.recognize(image, code_type, str_debug, **options)

    async def post_pic_base64(
        self,
        image: bytes | str | Any,
        code_type: int | str,
        str_debug: str | None = None,
        **options: Any,
    ) -> RecognizeResult:
        """Official sample name for a ``file_base64`` upload."""
        options["upload"] = "base64"
        return await self.recognize(image, code_type, str_debug, **options)

    async def recognize_file(self, file_path: str, code_type: int | str, **options: Any) -> RecognizeResult:
        """Read an image from disk and recognize it."""
        with open(file_path, "rb") as handle:
            payload = handle.read()
        return await self.recognize(payload, code_type, **options)

    async def report_error(self, pic_id: str) -> ReportErrorResult:
        """Async form of :meth:`Chaojiying.report_error`."""
        return shape_report(await self._request(self._report_call(pic_id)))

    async def report(self, pic_id: str) -> ReportErrorResult:
        """Alias of :meth:`report_error`."""
        return await self.report_error(pic_id)

    async def recognize_free(
        self,
        image: bytes | str | Any,
        model: int | str,
        *,
        upload: str = "base64",
        filename: str = "captcha.jpg",
        api_key: str | None = None,
    ) -> RecognizeResult:
        """Async free OCR v2."""
        call, shape = build_free_call(
            self.session, image, model, upload=upload, filename=filename, api_key=api_key
        )
        return self._finish(await self._request(call), model, False, shape)

    async def _request(self, call: Call) -> dict[str, Any]:
        attempt = 0
        attempts = self.session.retries + 1
        while True:
            try:
                return await self._send_once(call)
            except Exception as exc:
                attempt += 1
                if attempt >= attempts or not is_retryable(exc, call.policy):
                    raise
                delay = self.session.retry_delay * attempt
                if delay > 0:
                    await asyncio.sleep(delay)

    async def _send_once(self, call: Call) -> dict[str, Any]:
        client = self._free if call.free else self._client
        try:
            response = await client.post(
                call.path,
                data=call.data,
                json=call.json_body,
                files=call.files,
                params=call.params,
            )
        except httpx.RequestError as exc:
            mapped = _map_transport(exc)
            if mapped is exc:
                raise
            raise mapped from exc
        return _decode(response)
