"""Parameter builders for Cap.guru `in.php` tasks."""

from __future__ import annotations

from typing import Any

from capguru.constants import CLICK, TEXT_INSTRUCTIONS


def _put(params: dict[str, Any], key: str, value: Any) -> None:
    if value is not None:
        params[key] = value


def _extra(params: dict[str, Any], extra: dict[str, Any] | None) -> None:
    if not extra:
        return
    for key, value in extra.items():
        params.setdefault(key, value)


def _transport(
    params: dict[str, Any],
    *,
    cookies: str | None,
    user_agent: str | None,
    proxy: str | None,
    proxy_type: str | None,
    extra: dict[str, Any] | None,
) -> None:
    _put(params, "cookies", cookies)
    _put(params, "userAgent", user_agent)
    _put(params, "proxy", proxy)
    _put(params, "proxytype", proxy_type)
    _extra(params, extra)


def image_params(
    body: str,
    *,
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
) -> dict[str, Any]:
    params: dict[str, Any] = {"method": "base64", "body": body}
    _put(params, "phrase", phrase)
    _put(params, "regsense", regsense)
    _put(params, "numeric", numeric)
    _put(params, "calc", calc)
    _put(params, "min_len", min_len)
    _put(params, "max_len", max_len)
    _put(params, "language", language)
    _put(params, "textinstructions", textinstructions)
    _put(params, "vernet", vernet)
    _extra(params, extra)
    return params


def image_file_params(
    *,
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
) -> dict[str, Any]:
    params = image_params(
        "",
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
    params["method"] = "post"
    params.pop("body", None)
    return params


def text_params(
    text: str, *, language: int | None = None, extra: dict[str, Any] | None = None
) -> dict[str, Any]:
    params: dict[str, Any] = {"textcaptcha": text}
    _put(params, "language", language)
    _extra(params, extra)
    return params


def recaptcha_v2_params(
    googlekey: str,
    pageurl: str,
    *,
    invisible: bool = False,
    data_s: str | None = None,
    enterprise: bool = False,
    cookies: str | None = None,
    user_agent: str | None = None,
    proxy: str | None = None,
    proxy_type: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"method": "userrecaptcha", "googlekey": googlekey, "pageurl": pageurl}
    if invisible:
        params["invisible"] = 1
    if data_s:
        params["data-s"] = data_s
    if enterprise:
        params["enterprise"] = 1
    _transport(
        params,
        cookies=cookies,
        user_agent=user_agent,
        proxy=proxy,
        proxy_type=proxy_type,
        extra=extra,
    )
    return params


def recaptcha_v3_params(
    googlekey: str,
    pageurl: str,
    *,
    action: str | None = None,
    min_score: float | None = None,
    enterprise: bool = False,
    cookies: str | None = None,
    user_agent: str | None = None,
    proxy: str | None = None,
    proxy_type: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "method": "userrecaptcha",
        "version": "v3",
        "googlekey": googlekey,
        "pageurl": pageurl,
    }
    _put(params, "action", action)
    _put(params, "min_score", min_score)
    if enterprise:
        params["enterprise"] = 1
    _transport(
        params,
        cookies=cookies,
        user_agent=user_agent,
        proxy=proxy,
        proxy_type=proxy_type,
        extra=extra,
    )
    return params


def turnstile_params(
    sitekey: str,
    pageurl: str,
    *,
    action: str | None = None,
    data: str | None = None,
    cookies: str | None = None,
    user_agent: str | None = None,
    proxy: str | None = None,
    proxy_type: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"method": "turnstile", "sitekey": sitekey, "pageurl": pageurl}
    _put(params, "action", action)
    _put(params, "data", data)
    _transport(
        params,
        cookies=cookies,
        user_agent=user_agent,
        proxy=proxy,
        proxy_type=proxy_type,
        extra=extra,
    )
    return params


def hcaptcha_params(
    sitekey: str,
    pageurl: str,
    *,
    invisible: bool = False,
    data: str | None = None,
    cookies: str | None = None,
    user_agent: str | None = None,
    proxy: str | None = None,
    proxy_type: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"method": "hcaptcha", "sitekey": sitekey, "pageurl": pageurl}
    if invisible:
        params["invisible"] = 1
    _put(params, "data", data)
    _transport(
        params,
        cookies=cookies,
        user_agent=user_agent,
        proxy=proxy,
        proxy_type=proxy_type,
        extra=extra,
    )
    return params


def funcaptcha_params(
    publickey: str,
    pageurl: str,
    *,
    surl: str | None = None,
    data: str | None = None,
    cookies: str | None = None,
    user_agent: str | None = None,
    proxy: str | None = None,
    proxy_type: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"method": "funcaptcha", "publickey": publickey, "pageurl": pageurl}
    _put(params, "surl", surl)
    _put(params, "data", data)
    _transport(
        params,
        cookies=cookies,
        user_agent=user_agent,
        proxy=proxy,
        proxy_type=proxy_type,
        extra=extra,
    )
    return params


def geetest_params(
    gt: str,
    challenge: str,
    pageurl: str,
    *,
    api_server: str | None = None,
    cookies: str | None = None,
    user_agent: str | None = None,
    proxy: str | None = None,
    proxy_type: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "method": "geetest",
        "gt": gt,
        "challenge": challenge,
        "pageurl": pageurl,
    }
    _put(params, "api_server", api_server)
    _transport(
        params,
        cookies=cookies,
        user_agent=user_agent,
        proxy=proxy,
        proxy_type=proxy_type,
        extra=extra,
    )
    return params


def click_params(
    textinstructions: str,
    click: str,
    *,
    body: str | None = None,
    body0: str | None = None,
    body1: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "method": "base64",
        "textinstructions": textinstructions,
        "click": click,
    }
    _put(params, "body", body)
    _put(params, "body0", body0)
    _put(params, "body1", body1)
    _extra(params, extra)
    return params


def binance_params(
    *,
    body: str | None = None,
    body0: str | None = None,
    body1: str | None = None,
    object_name: str | None = None,
    textinstructions: str | None = None,
    grid: bool = False,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    instruction = (
        textinstructions
        if textinstructions is not None
        else f"binance,{object_name or ''}".rstrip(",")
    )
    return click_params(
        instruction,
        CLICK["GEETEST_GRID"] if grid else CLICK["GEETEST"],
        body=body,
        body0=body0,
        body1=body1,
        extra=extra,
    )


def tiktok_params(
    *,
    variant: str = "slider",
    question: str | None = None,
    body: str | None = None,
    body0: str | None = None,
    body1: str | None = None,
    textinstructions: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    instruction = textinstructions
    if instruction is None:
        if variant == "question":
            instruction = f"abc,{question or ''}".rstrip(",")
        elif variant == "koleso":
            instruction = TEXT_INSTRUCTIONS["TIKTOK_KOLESO"]
        elif variant == "kolesso":
            instruction = TEXT_INSTRUCTIONS["TIKTOK_KOLESSO"]
        elif variant == "abc":
            instruction = TEXT_INSTRUCTIONS["TIKTOK_ABC"]
        else:
            instruction = TEXT_INSTRUCTIONS["SLIDER"]
    return click_params(
        instruction, CLICK["GEETEST"], body=body, body0=body0, body1=body1, extra=extra
    )


def aws_params(
    *,
    body: str | None = None,
    body0: str | None = None,
    body1: str | None = None,
    instruction: str | None = None,
    textinstructions: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    raw = textinstructions if textinstructions is not None else (instruction or "")
    if raw.lower().startswith("amazon,"):
        text = raw
    else:
        text = f"Amazon,{raw}".rstrip(",")
    return click_params(text, CLICK["OTHER"], body=body, body0=body0, body1=body1, extra=extra)


def temu_params(
    textinstructions: str,
    *,
    body: str | None = None,
    body0: str | None = None,
    body1: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return click_params(
        textinstructions, CLICK["TEMU"], body=body, body0=body0, body1=body1, extra=extra
    )


def slider_params(
    *,
    body: str | None = None,
    piece: str | None = None,
    body0: str | None = None,
    body1: str | None = None,
    textinstructions: str | None = None,
    click: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    background = body0 if body0 is not None else (body if piece else None)
    puzzle = body1 if body1 is not None else piece
    single = None if background or puzzle else body
    return click_params(
        textinstructions or TEXT_INSTRUCTIONS["SLIDER"],
        click or CLICK["GEETEST"],
        body=single,
        body0=background,
        body1=puzzle,
        extra=extra,
    )


def prefixed_params(
    prefix: str,
    instruction: str,
    *,
    body: str | None = None,
    body0: str | None = None,
    body1: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return click_params(
        f"{prefix},{instruction}", CLICK["OTHER"], body=body, body0=body0, body1=body1, extra=extra
    )
