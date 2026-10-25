"""Client for partner pushes to Grizzly SMS."""

from __future__ import annotations

import time
from typing import Any

import httpx

from grizzly_sms.errors import GrizzlySmsError
from grizzly_sms.parse import js_string
from grizzly_sms.types import PartnerStatus

DEFAULT_BASE_URL = "https://api.grizzlysms.com"
USER_AGENT = "grizzly-sms/2.0.0"
PUSH_PATH = "/agent/api/sms"


def _decode(response: httpx.Response) -> Any:
    content_type = response.headers.get("content-type", "")
    if "json" in content_type.lower():
        try:
            return response.json()
        except ValueError:
            return response.text
    return response.text


def _read_status(data: Any) -> PartnerStatus:
    if not isinstance(data, dict) or "status" not in data:
        raise GrizzlySmsError("UNEXPECTED_RESPONSE", data)
    status_value = data["status"]
    status = "" if status_value is None else js_string(status_value)
    if "error" not in data:
        error = None
    else:
        error = js_string(data["error"])
    return PartnerStatus(status=status, error=error)


class GrizzlyPartner:
    """Send ``PUSH_SMS``, ``PUSH_CALL``, and ``PUSH_CALL_RECORD``.

    ``GET_SERVICES``, ``GET_NUMBER``, and ``FINISH_ACTIVATION`` are incoming
    requests to the partner server. This client does not implement them.
    Pushes go to ``/agent/api/sms``. A non-``SUCCESS`` status is retried only
    when ``retries`` is set. The protocol pause is 10 seconds.

    Examples:
        partner = GrizzlyPartner(partner_key)
        partner.push_sms(
            sms_id=1,
            phone=447472190082,
            phone_from="Microsoft",
            text="code 5015",
        )
    """

    def __init__(
        self,
        key: str,
        *,
        base_url: str | None = None,
        timeout_ms: float | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        """Create a partner client.

        Args:
            key: Partner key from the personal account. Blank keys raise ``NO_KEY``.
            base_url: Defaults to ``https://api.grizzlysms.com``.
            timeout_ms: Request timeout in milliseconds. Defaults to 30000.
            client: Optional ``httpx.Client``. It is not closed by this object.

        Examples:
            partner = GrizzlyPartner(partner_key)
        """
        if not key or not key.strip():
            raise GrizzlySmsError("NO_KEY", "Partner key is required")
        self._key = key.strip()
        self._owns_client = client is None
        if client is not None:
            self._http = client
            return
        root = (base_url or DEFAULT_BASE_URL).rstrip("/")
        timeout = 30.0 if timeout_ms is None else timeout_ms / 1000
        self._http = httpx.Client(
            base_url=root,
            timeout=timeout,
            headers={"Accept": "application/json", "User-Agent": USER_AGENT},
        )

    def close(self) -> None:
        """Close the HTTP client when this object created it.

        Examples:
            partner.close()
        """
        if self._owns_client:
            self._http.close()

    def __enter__(self) -> GrizzlyPartner:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def push_sms(
        self,
        *,
        sms_id: int,
        phone: int,
        phone_from: str,
        text: str,
        retries: int = 0,
        retry_delay_ms: float | None = None,
    ) -> PartnerStatus:
        """Deliver an inbound SMS (``PUSH_SMS``).

        Examples:
            partner.push_sms(
                sms_id=1,
                phone=447472190082,
                phone_from="Microsoft",
                text="code 5015",
            )
        """
        return self._post_json(
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

    def push_call(
        self,
        *,
        call_id: int,
        phone: int,
        phone_from: str,
        retries: int = 0,
        retry_delay_ms: float | None = None,
    ) -> PartnerStatus:
        """Deliver a flash call (``PUSH_CALL``).

        Examples:
            partner.push_call(call_id=10, phone=447472190082, phone_from="100")
        """
        return self._post_json(
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

    def push_call_record(
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
        """Deliver a call recording (``PUSH_CALL_RECORD``).

        ``text`` or ``file`` is required. The body is ``multipart/form-data``.

        Examples:
            partner.push_call_record(
                call_id=10,
                phone=447472190082,
                phone_from="100",
                text="your code is 5015",
            )
        """
        if not text and not file:
            raise GrizzlySmsError("BAD_ACTION", "pushCallRecord requires text or file")
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
        return self._send(
            lambda: self._http.post(PUSH_PATH, files=form),
            retries=retries,
            retry_delay_ms=retry_delay_ms,
        )

    def _post_json(
        self,
        body: dict[str, Any],
        *,
        retries: int,
        retry_delay_ms: float | None,
    ) -> PartnerStatus:
        return self._send(
            lambda: self._http.post(
                PUSH_PATH,
                json=body,
                headers={"Content-Type": "application/json"},
            ),
            retries=retries,
            retry_delay_ms=retry_delay_ms,
        )

    def _send(
        self,
        request: Any,
        *,
        retries: int,
        retry_delay_ms: float | None,
    ) -> PartnerStatus:
        attempts = retries + 1
        delay_ms = 10_000 if retry_delay_ms is None else retry_delay_ms
        last: PartnerStatus | None = None
        for attempt in range(1, attempts + 1):
            try:
                response = request()
            except httpx.HTTPError as exc:
                raise GrizzlySmsError("NETWORK", str(exc)) from exc
            if response.status_code >= 400:
                raise GrizzlySmsError(
                    f"HTTP_{response.status_code}",
                    _decode(response),
                )
            status = _read_status(_decode(response))
            if status.status == "SUCCESS":
                return status
            last = status
            if attempt < attempts:
                time.sleep(delay_ms / 1000)
        code = (last.status if last else "") or "ERROR"
        raw: Any = code if last is None or last.error is None else last.error
        if last is not None and last.error is None:
            raw = last.status
        raise GrizzlySmsError(code, raw)
