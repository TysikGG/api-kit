"""Asynchronous partner push client."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from grizzly_sms.errors import error_from
from grizzly_sms.partner import (
    DEFAULT_BASE_URL,
    PUSH_PATH,
    USER_AGENT,
    _decode,
    _read_status,
)
from grizzly_sms.types import PartnerStatus


class AsyncGrizzlyPartner:
    """Send ``PUSH_SMS``, ``PUSH_CALL``, and ``PUSH_CALL_RECORD`` asynchronously.

    Examples:
        async with AsyncGrizzlyPartner(partner_key) as partner:
            await partner.push_sms(sms_id=1, phone=1, phone_from="Microsoft", text="5015")
    """

    def __init__(
        self,
        key: str,
        *,
        base_url: str | None = None,
        timeout_ms: float | None = None,
        client: httpx.AsyncClient | None = None,
        proxy: str | None = None,
    ) -> None:
        """Create an async partner client.

        Args:
            key: Partner key. Blank keys raise ``NO_KEY``.
            base_url: Defaults to ``https://api.grizzlysms.com``.
            timeout_ms: Request timeout in milliseconds. Defaults to 30000.
            client: Optional ``httpx.AsyncClient``. It is not closed when passed in.
            proxy: Proxy URL. Ignored when ``client`` is set.

        Examples:
            partner = AsyncGrizzlyPartner(partner_key)
        """
        if not key or not key.strip():
            raise error_from("NO_KEY", "Partner key is required")
        self._key = key.strip()
        self._owns_client = client is None
        if client is not None:
            self._http = client
            return
        root = (base_url or DEFAULT_BASE_URL).rstrip("/")
        timeout = 30.0 if timeout_ms is None else timeout_ms / 1000
        self._http = httpx.AsyncClient(
            base_url=root,
            timeout=timeout,
            proxy=proxy,
            headers={"Accept": "application/json", "User-Agent": USER_AGENT},
        )

    async def aclose(self) -> None:
        """Close the HTTP client when this object created it.

        Examples:
            await partner.aclose()
        """
        if self._owns_client:
            await self._http.aclose()

    async def __aenter__(self) -> AsyncGrizzlyPartner:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def push_sms(
        self,
        *,
        sms_id: int,
        phone: int,
        phone_from: str,
        text: str,
        retries: int = 0,
        retry_delay_ms: float | None = None,
    ) -> PartnerStatus:
        """Deliver an inbound SMS.

        Examples:
            await partner.push_sms(sms_id=1, phone=1, phone_from="Microsoft", text="5015")
        """
        return await self._post_json(
            {
                "action": "PUSH_SMS",
                "key": self._key,
                "smsId": sms_id,
                "phone": phone,
                "phoneFrom": phone_from,
                "text": text,
            },
            retries=retries,
            retry_delay_ms=retry_delay_ms,
        )

    async def push_call(
        self,
        *,
        call_id: int,
        phone: int,
        phone_from: str,
        retries: int = 0,
        retry_delay_ms: float | None = None,
    ) -> PartnerStatus:
        """Deliver a flash call.

        Examples:
            await partner.push_call(call_id=10, phone=447472190082, phone_from="100")
        """
        return await self._post_json(
            {
                "action": "PUSH_CALL",
                "key": self._key,
                "callId": call_id,
                "phone": phone,
                "phoneFrom": phone_from,
            },
            retries=retries,
            retry_delay_ms=retry_delay_ms,
        )

    async def push_call_record(
        self,
        *,
        call_id: int,
        phone: int,
        phone_from: str,
        text: str | None = None,
        file: bytes | bytearray | None = None,
        filename: str | None = None,
        retries: int = 0,
        retry_delay_ms: float | None = None,
    ) -> PartnerStatus:
        """Deliver a call recording. ``text`` or ``file`` is required.

        Examples:
            await partner.push_call_record(call_id=10, phone=1, phone_from="100", text="5015")
        """
        if not text and not file:
            raise error_from("BAD_ACTION", "pushCallRecord requires text or file")
        form: dict[str, tuple[str | None, bytes | str]] = {
            "action": (None, "PUSH_CALL_RECORD"),
            "key": (None, self._key),
            "callId": (None, str(call_id)),
            "phone": (None, str(phone)),
            "phoneFrom": (None, phone_from),
        }
        if text:
            form["text"] = (None, text)
        if file is not None:
            form["file"] = (filename or "record", bytes(file))
        return await self._send(
            lambda: self._http.post(PUSH_PATH, files=form),
            retries=retries,
            retry_delay_ms=retry_delay_ms,
        )

    async def _post_json(
        self, body: dict[str, Any], *, retries: int, retry_delay_ms: float | None
    ) -> PartnerStatus:
        return await self._send(
            lambda: self._http.post(
                PUSH_PATH, json=body, headers={"Content-Type": "application/json"}
            ),
            retries=retries,
            retry_delay_ms=retry_delay_ms,
        )

    async def _send(
        self, request: Any, *, retries: int, retry_delay_ms: float | None
    ) -> PartnerStatus:
        attempts = retries + 1
        delay_ms = 10_000 if retry_delay_ms is None else retry_delay_ms
        last: PartnerStatus | None = None
        for attempt in range(1, attempts + 1):
            try:
                response = await request()
            except httpx.HTTPError as exc:
                raise error_from("NETWORK", str(exc)) from exc
            if response.status_code >= 400:
                raise error_from(f"HTTP_{response.status_code}", _decode(response))
            status = _read_status(_decode(response))
            if status.status == "SUCCESS":
                return status
            last = status
            if attempt < attempts:
                await asyncio.sleep(delay_ms / 1000)
        code = (last.status if last else "") or "ERROR"
        raw: Any = last.status if last is None or last.error is None else last.error
        raise error_from(code, raw)
