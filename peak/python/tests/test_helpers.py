"""Unit tests for Peak helpers that do not speak HTTP."""

import pytest

from peak import (
    APP_ID,
    AuthenticationError,
    BadRequestError,
    ErrorCode,
    InsufficientBalanceError,
    PeakError,
    RateLimitError,
    RetryTimeoutError,
    ServiceUnavailableError,
    SolveError,
    TaskDisabledError,
    UpstreamError,
    assert_http_proxy,
    assert_http_url,
    assert_page_url,
    build_clearance_request,
    classify_error,
    clearance_user_agent,
    cookie_header,
    ensure_trailing_slash,
    format_balance,
    format_proxy,
    is_retryable,
)
from peak.protocol import read_balance, read_solve
from peak.util import clamp_retries


def test_retry_clamp_and_envelope_guards() -> None:
    assert clamp_retries(None, 2) == 2
    assert clamp_retries(-4, 2) == 0
    assert clamp_retries(True, 2) == 0  # type: ignore[arg-type]
    assert clamp_retries(1.5, 2) == 0  # type: ignore[arg-type]
    with pytest.raises(PeakError, match="non-JSON"):
        read_balance([1, 2])
    with pytest.raises(PeakError, match="non-JSON"):
        read_solve("nope")
    with pytest.raises(PeakError, match="Solve task failed"):
        read_solve({"success": False})


def test_app_id_constant() -> None:
    assert APP_ID == "app_05c1f418153804ec393a7211"


def test_format_proxy() -> None:
    assert format_proxy("  http://user:pass@1.2.3.4:8080 ") == "http://user:pass@1.2.3.4:8080"
    assert format_proxy(
        {"host": "1.2.3.4", "port": 8080, "username": "a@b", "password": "p:q"}
    ) == "http://a%40b:p%3Aq@1.2.3.4:8080"
    assert format_proxy({"protocol": "socks5", "host": "2001:db8::1", "port": 1080}) == (
        "socks5://[2001:db8::1]:1080"
    )
    assert format_proxy({"host": "[::1]", "port": 1, "username": "u"}) == "http://u:@[::1]:1"
    with pytest.raises(BadRequestError, match="empty"):
        format_proxy("  ")
    with pytest.raises(BadRequestError, match="Unsupported proxy protocol"):
        format_proxy({"protocol": "ftp", "host": "h", "port": 1})
    with pytest.raises(BadRequestError, match="port"):
        format_proxy({"host": "h", "port": 0})
    with pytest.raises(BadRequestError, match="port"):
        format_proxy({"host": "h", "port": True})
    with pytest.raises(BadRequestError, match="host"):
        format_proxy({"host": "  ", "port": 80})


def test_http_proxy_and_urls() -> None:
    assert assert_http_proxy("http://127.0.0.1:8888") == "http://127.0.0.1:8888"
    with pytest.raises(BadRequestError, match="SOCKS"):
        assert_http_proxy("socks5://127.0.0.1:1080")
    with pytest.raises(BadRequestError, match="absolute"):
        assert_http_proxy("not a url")
    with pytest.raises(BadRequestError, match="empty"):
        assert_http_proxy("  ")
    assert ensure_trailing_slash("https://example.com/login?x=1#y") == (
        "https://example.com/login/?x=1#y"
    )
    assert assert_page_url("https://example.com") == "https://example.com/"
    assert assert_http_url("https://sdk.example/a/b", "sdk_url") == "https://sdk.example/a/b"
    with pytest.raises(BadRequestError, match="url is required"):
        assert_page_url("")
    with pytest.raises(BadRequestError, match="absolute"):
        assert_page_url("example.com")
    with pytest.raises(BadRequestError, match="http or https"):
        assert_page_url("ftp://example.com")
    with pytest.raises(BadRequestError, match="sdk_url is required"):
        assert_http_url("", "sdk_url")


def test_format_balance_and_clearance() -> None:
    assert format_balance({"type": "pay_per_solve", "balance": 1.5}) == "$1.5"
    assert format_balance(
        {
            "type": "package",
            "package_name": "Turnstile 500K",
            "remaining_solves": 10,
            "total_solves": 500,
            "days_remaining": 3,
        }
    ) == "Turnstile 500K, 10/500 solves left, 3 days left"
    assert format_balance({"type": "package", "package": "Legacy"}) == "Legacy"
    assert format_balance({"type": "package"}) == "package"
    assert format_balance({"type": "package", "remaining_solves": 4, "days_remaining": 1}) == (
        "package, 4 solves left, 1 days left"
    )

    request = build_clearance_request(
        "https://example.com/app",
        {
            "cookies": {"cf_clearance": "abc", "__cf_bm": "bm"},
            "headers": {"user-agent": "Mozilla/5.0"},
            "attributes": {"md": "m", "r": "r", "extra": "e"},
            "cf_rt": "tok",
        },
    )
    assert request["url"] == "https://example.com/app/"
    assert request["referer"] == "https://example.com/app/?__cf_chl_tk=tok"
    assert request["cookie_header"] == "cf_clearance=abc; __cf_bm=bm"
    assert request["headers"]["Cookie"] == request["cookie_header"]
    assert "md=m" in request["body"]
    assert cookie_header(None) == ""
    assert clearance_user_agent({"headers": {}}) == ""
    bare = build_clearance_request("https://example.com/", {"cf_rt": ""})
    assert bare["user_agent"] == ""
    assert "Cookie" not in bare["headers"]


def test_classify_error() -> None:
    missing = classify_error("missing API key", 400)
    assert isinstance(missing, AuthenticationError)
    assert missing.code == ErrorCode.MISSING_API_KEY
    assert missing.status == 400
    assert missing.data is None
    assert "missing API key" in repr(missing)
    assert isinstance(classify_error("nope", 401), AuthenticationError)
    exhausted = classify_error("package solves exhausted", 200)
    assert isinstance(exhausted, InsufficientBalanceError)
    assert exhausted.code == ErrorCode.PACKAGE_EXHAUSTED
    assert isinstance(classify_error("bad field", 400), BadRequestError)
    assert isinstance(classify_error("slow down", 429), RateLimitError)
    disabled = classify_error("task type disabled", 200)
    assert isinstance(disabled, TaskDisabledError)
    assert disabled.status_code == 200
    down = classify_error("capacity", 503)
    assert isinstance(down, ServiceUnavailableError)
    assert isinstance(down, TaskDisabledError)
    assert isinstance(classify_error("bad gateway", 502), UpstreamError)
    flagged = classify_error("Turnstile challenge was flagged", 200)
    assert isinstance(flagged, SolveError)
    assert flagged.code == ErrorCode.TURNSTILE_FLAGGED
    assert classify_error("Invalid sitekey", 200).code == ErrorCode.INVALID_SITEKEY
    assert classify_error("Unsupported user agent", 200).code == ErrorCode.UNSUPPORTED_USER_AGENT
    assert classify_error("No WAF challenge detected", 200).code == ErrorCode.NO_WAF_CHALLENGE
    assert classify_error("IP address is blocked by CloudFlare", 200).code == ErrorCode.IP_BLOCKED
    assert classify_error("Proxy connection failed", 200).code == ErrorCode.PROXY_CONNECTION_FAILED
    assert isinstance(classify_error("Request timed out", 200), SolveError)
    assert classify_error("Request timed out", 0).code == ErrorCode.REQUEST_TIMED_OUT
    assert classify_error("something else", 0).code == ErrorCode.NETWORK
    assert classify_error("weird", 504).status_code == 504
    assert isinstance(classify_error("rate limit reached", 200), RateLimitError)
    assert classify_error("insufficient balance", 402).code == ErrorCode.INSUFFICIENT_BALANCE

    assert is_retryable(SolveError("x"))
    assert is_retryable(PeakError("net"))
    assert is_retryable(UpstreamError("up"))
    assert is_retryable(TaskDisabledError("off"))
    assert not is_retryable(BadRequestError("bad"))
    assert not is_retryable(RetryTimeoutError())
    assert not is_retryable(InsufficientBalanceError("bal"))
    assert not is_retryable(AuthenticationError("auth"))
    assert not is_retryable(RuntimeError("x"))
