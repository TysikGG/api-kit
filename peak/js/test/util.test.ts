import {
  AuthenticationError,
  BadRequestError,
  buildClearanceRequest,
  classifyPeakError,
  clearanceUserAgent,
  cookieHeader,
  ensureTrailingSlash,
  formatBalance,
  formatProxy,
  InsufficientBalanceError,
  isRetryablePeakError,
  PeakError,
  PeakErrorCode,
  RateLimitError,
  RetryTimeoutError,
  ServiceUnavailableError,
  SolveError,
  TaskDisabledError,
  UpstreamError,
} from "../src/index.js";
import { axiosProxyConfig, assertHttpUrl, assertPageUrl } from "../src/util.js";

describe("proxy and URL helpers", () => {
  it("passes proxy strings through and formats objects", () => {
    expect(formatProxy("  http://user:pass@1.2.3.4:8080  ")).toBe(
      "http://user:pass@1.2.3.4:8080",
    );
    expect(
      formatProxy({
        host: "1.2.3.4",
        port: 8080,
        username: "a@b",
        password: "p:q",
      }),
    ).toBe("http://a%40b:p%3Aq@1.2.3.4:8080");
    expect(
      formatProxy({ protocol: "socks5", host: "2001:db8::1", port: 1080 }),
    ).toBe("socks5://[2001:db8::1]:1080");
  });

  it("rejects empty, unknown, and invalid proxies", () => {
    expect(() => formatProxy("  ")).toThrow(BadRequestError);
    expect(() => formatProxy({ protocol: "ftp" as "http", host: "h", port: 1 })).toThrow(
      /Unsupported proxy protocol/,
    );
    expect(() => formatProxy({ host: "h", port: 0 })).toThrow(/port/);
    expect(() => formatProxy({ host: "  ", port: 80 })).toThrow(/host/);
    expect(formatProxy({ host: "[::1]", port: 1, username: "u" })).toBe("http://u:@[::1]:1");
  });

  it("keeps bracketed hosts and formats the API transport proxy", () => {
    expect(formatProxy({ host: "[::1]", port: 9050, protocol: "socks5h" })).toBe(
      "socks5h://[::1]:9050",
    );
    expect(axiosProxyConfig("https://proxy.example")).toEqual({
      protocol: "https",
      host: "proxy.example",
      port: 443,
    });
    expect(axiosProxyConfig("http://user:p%40ss@127.0.0.1:8888")).toEqual({
      protocol: "http",
      host: "127.0.0.1",
      port: 8888,
      auth: { username: "user", password: "p@ss" },
    });
    expect(() => axiosProxyConfig("socks5://127.0.0.1:1080")).toThrow(/SOCKS/);
    expect(() => axiosProxyConfig("not a url")).toThrow(/absolute URL/);
    expect(() => axiosProxyConfig("   ")).toThrow(/empty/);
  });

  it("normalizes page URLs and checks schemes", () => {
    expect(ensureTrailingSlash("https://example.com/login?x=1#y")).toBe(
      "https://example.com/login/?x=1#y",
    );
    expect(assertPageUrl("https://example.com")).toBe("https://example.com/");
    expect(assertHttpUrl("https://sdk.example/a/b", "sdkUrl")).toBe(
      "https://sdk.example/a/b",
    );
    expect(() => assertPageUrl("")).toThrow(/url is required/);
    expect(() => assertPageUrl("example.com")).toThrow(/absolute URL/);
    expect(() => assertPageUrl("ftp://example.com")).toThrow(/http or https/);
    expect(() => assertHttpUrl("", "sdkUrl")).toThrow(/sdkUrl is required/);
  });
});

describe("balance and clearance helpers", () => {
  it("formats pay-per-solve and package balances", () => {
    expect(formatBalance({ type: "pay_per_solve", balance: 1.5 })).toBe("$1.5");
    expect(
      formatBalance({
        type: "package",
        package_name: "Turnstile 500K",
        remaining_solves: 10,
        total_solves: 500,
        days_remaining: 3,
      }),
    ).toBe("Turnstile 500K, 10/500 solves left, 3 days left");
    expect(formatBalance({ type: "package", package: "Legacy" })).toBe("Legacy");
    expect(formatBalance({ type: "package" })).toBe("package");
    expect(
      formatBalance({ type: "package", remaining_solves: 4, days_remaining: 1 }),
    ).toBe("package, 4 solves left, 1 days left");
  });

  it("builds a clearance POST from a 5-second solution", () => {
    const request = buildClearanceRequest("https://example.com/app", {
      cookies: { cf_clearance: "abc", __cf_bm: "bm" },
      headers: { "user-agent": "Mozilla/5.0" },
      attributes: { md: "m", r: "r", extra: "e" },
      cf_rt: "tok",
    });
    expect(request.url).toBe("https://example.com/app/");
    expect(request.method).toBe("POST");
    expect(request.referer).toBe("https://example.com/app/?__cf_chl_tk=tok");
    expect(request.userAgent).toBe("Mozilla/5.0");
    expect(request.cookieHeader).toBe("cf_clearance=abc; __cf_bm=bm");
    expect(request.headers.Cookie).toBe(request.cookieHeader);
    expect(request.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(request.body).toContain("md=m");
    expect(request.body).toContain("extra=e");
    expect(cookieHeader(undefined)).toBe("");
    expect(clearanceUserAgent({ cookies: {}, headers: {}, attributes: { md: "", r: "" }, cf_rt: "" })).toBe(
      "",
    );
  });
});

describe("retry classification", () => {
  it("retries transport and solve failures only", () => {
    expect(isRetryablePeakError(new Error("x"))).toBe(false);
    expect(isRetryablePeakError(new SolveError("x"))).toBe(true);
    expect(isRetryablePeakError(new PeakError("net"))).toBe(true);
    expect(isRetryablePeakError(new UpstreamError("up"))).toBe(true);
    expect(isRetryablePeakError(new BadRequestError("bad"))).toBe(false);
    expect(isRetryablePeakError(new RetryTimeoutError())).toBe(false);
    expect(isRetryablePeakError(new InsufficientBalanceError("bal"))).toBe(false);
    expect(isRetryablePeakError(new AuthenticationError("auth"))).toBe(false);
    expect(isRetryablePeakError(new TaskDisabledError("off"))).toBe(true);
  });
});

describe("classifyPeakError", () => {
  it("maps statuses and known phrases", () => {
    expect(classifyPeakError("missing API key", 400).code).toBe(PeakErrorCode.MISSING_API_KEY);
    expect(classifyPeakError("missing API key", 400)).toBeInstanceOf(AuthenticationError);
    expect(classifyPeakError("nope", 401)).toBeInstanceOf(AuthenticationError);
    expect(classifyPeakError("package solves exhausted", 200)).toBeInstanceOf(
      InsufficientBalanceError,
    );
    expect(classifyPeakError("insufficient balance", 402).code).toBe(
      PeakErrorCode.INSUFFICIENT_BALANCE,
    );
    expect(classifyPeakError("bad field", 400)).toBeInstanceOf(BadRequestError);
    expect(classifyPeakError("slow down", 429)).toBeInstanceOf(RateLimitError);
    const disabled = classifyPeakError("task type disabled", 200);
    expect(disabled).toBeInstanceOf(TaskDisabledError);
    expect(disabled.status).toBe(200);
    const down = classifyPeakError("capacity", 503);
    expect(down).toBeInstanceOf(ServiceUnavailableError);
    expect(down).toBeInstanceOf(TaskDisabledError);
    expect(classifyPeakError("bad gateway", 502)).toBeInstanceOf(UpstreamError);
    const flagged = classifyPeakError("Turnstile challenge was flagged", 200);
    expect(flagged).toBeInstanceOf(SolveError);
    expect(flagged.code).toBe(PeakErrorCode.TURNSTILE_FLAGGED);
    expect(classifyPeakError("Invalid sitekey", 200).code).toBe(PeakErrorCode.INVALID_SITEKEY);
    expect(classifyPeakError("Unsupported user agent", 200).code).toBe(
      PeakErrorCode.UNSUPPORTED_USER_AGENT,
    );
    expect(classifyPeakError("No WAF challenge detected", 200).code).toBe(
      PeakErrorCode.NO_WAF_CHALLENGE,
    );
    expect(classifyPeakError("IP address is blocked by CloudFlare", 200).code).toBe(
      PeakErrorCode.IP_BLOCKED,
    );
    expect(classifyPeakError("Proxy connection failed", 200).code).toBe(
      PeakErrorCode.PROXY_CONNECTION_FAILED,
    );
    expect(classifyPeakError("Request timed out", 200)).toBeInstanceOf(SolveError);
    expect(classifyPeakError("Request timed out", 0).code).toBe(PeakErrorCode.REQUEST_TIMED_OUT);
    expect(classifyPeakError("something else", 0).code).toBe(PeakErrorCode.NETWORK);
    expect(classifyPeakError("weird", 504).status).toBe(504);
    expect(classifyPeakError("rate limit reached", 200)).toBeInstanceOf(RateLimitError);
  });
});
