import axios, { type AxiosInstance } from "axios";
import MockAdapter from "axios-mock-adapter";

import {
  APP_ID,
  AuthenticationError,
  BadRequestError,
  InsufficientBalanceError,
  Peak,
  PeakClient,
  PeakError,
  PeakErrorCode,
  RetryTimeoutError,
  ServiceUnavailableError,
  SolveError,
  TaskDisabledError,
  TaskType,
  UpstreamError,
} from "../src/index.js";

describe("Peak client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("rejects a missing API key and trims a string key", () => {
    expect(() => new Peak("")).toThrow(PeakError);
    expect(() => new Peak({ apiKey: "  " })).toThrow(/API key is required/);
    expect(() => new Peak("   ")).toThrow(PeakError);
    expect(new PeakClient(" pk ")).toBeInstanceOf(Peak);
  });

  it("sends the trimmed key, custom base URL, timeout, and HTTP proxy", () => {
    const spy = jest.spyOn(axios, "create");
    new Peak({
      apiKey: " pk_test ",
      baseUrl: "https://example.test/api/",
      timeoutMs: 1500,
      httpProxy: "http://user:p%40ss@127.0.0.1:8888",
      retries: 2,
    });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://example.test/api",
        timeout: 1500,
        proxy: {
          protocol: "http",
          host: "127.0.0.1",
          port: 8888,
          auth: { username: "user", password: "p@ss" },
        },
        headers: expect.objectContaining({
          "X-API-Key": "pk_test",
          Accept: "application/json",
        }),
      }),
    );
    spy.mockRestore();
    expect(() => new Peak({ apiKey: "pk", httpProxy: "socks5://127.0.0.1:1080" })).toThrow(
      /SOCKS/,
    );
  });

  it("reads pay-per-solve and package balances", async () => {
    const client = new Peak("pk_test_123");
    mock.onGet("https://api.peak.fo/balance").replyOnce(200, {
      success: true,
      data: { type: "pay_per_solve", balance: 15.75 },
    });
    const pay = await client.getBalance();
    expect(pay).toEqual({ type: "pay_per_solve", balance: 15.75 });

    mock.onGet("https://api.peak.fo/balance").replyOnce(200, {
      success: true,
      data: {
        type: "package",
        package_name: "Turnstile 500K",
        remaining_solves: 10,
        total_solves: 500000,
        allowed_tasks: ["turnstiletask"],
        expires_at: "2026-06-25T00:00:00Z",
        days_remaining: 30,
      },
    });
    const pkg = await client.getBalance();
    expect(pkg.type).toBe("package");
    if (pkg.type === "package") {
      expect(pkg.package_name).toBe("Turnstile 500K");
      expect(pkg.remaining_solves).toBe(10);
    }
  });

  it("keeps the legacy package shape and surfaces balance failures", async () => {
    const client = new Peak("pk_test_123");
    mock.onGet("https://api.peak.fo/balance").replyOnce(200, {
      success: true,
      data: {
        type: "package",
        package: "Pro 10k",
        expires_at: "2026-12-31T00:00:00Z",
        days_remaining: 45,
      },
    });
    const balance = await client.getBalance();
    if (balance.type === "package") {
      expect(balance.package).toBe("Pro 10k");
      expect(balance.days_remaining).toBe(45);
    }

    mock.onGet("https://api.peak.fo/balance").replyOnce(200, {
      success: false,
      error: "Account suspended",
    });
    await expect(client.getBalance()).rejects.toThrow(SolveError);

    mock.onGet("https://api.peak.fo/balance").replyOnce(200, { success: false });
    await expect(client.getBalance()).rejects.toThrow("Failed to retrieve balance");

    mock.onGet("https://api.peak.fo/balance").replyOnce(200, { success: true });
    await expect(client.getBalance()).rejects.toThrow("Failed to retrieve balance");

    mock.onGet("https://api.peak.fo/balance").replyOnce(200, [1, 2]);
    await expect(client.getBalance()).rejects.toThrow(/non-JSON/);
  });

  it("solves proxyless and proxied Turnstile and always sends appId", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const taskTypes: string[] = [];
    const client = new Peak({
      apiKey: "pk_test_123",
      onResult: (event) => {
        taskTypes.push(event.taskType);
      },
    });
    mock.onPost("https://api.peak.fo/solve").reply((config) => {
      const body = JSON.parse(config.data as string) as Record<string, unknown>;
      seen.push(body);
      return [200, { success: true, data: { token: "tok-" + String(seen.length) } }];
    });

    const plain = await client.solveTurnstile({
      url: "https://example.com/login",
      sitekey: " 0x4AAAAAAA ",
    });
    expect(plain.token).toBe("tok-1");
    expect(seen[0]).toMatchObject({
      appId: APP_ID,
      task_type: "TurnstileTaskProxyLess",
      url: "https://example.com/login/",
      sitekey: "0x4AAAAAAA",
    });
    expect(seen[0]?.proxy).toBeUndefined();

    const proxied = await client.solveTurnstile({
      url: "https://example.com/a?x=1",
      sitekey: "0x4AAAAAAA",
      proxy: { host: "1.2.3.4", port: 8080, username: "user", password: "pass" },
      action: "login",
      cdata: "cdata",
      taskType: "turnstiletask",
    });
    expect(proxied.token).toBe("tok-2");
    expect(seen[1]).toMatchObject({
      appId: APP_ID,
      task_type: "turnstiletask",
      url: "https://example.com/a/?x=1",
      proxy: "http://user:pass@1.2.3.4:8080",
      action: "login",
      cdata: "cdata",
    });

    await client.solveTurnstile({
      url: "https://example.com/",
      sitekey: "0x4",
      proxy: "",
    });
    expect(seen[2]?.task_type).toBe("TurnstileTaskProxyLess");
    expect(taskTypes).toEqual([
      TaskType.TurnstileProxyLess,
      "turnstiletask",
      TaskType.TurnstileProxyLess,
    ]);
  });

  it("solves the 5-second challenge, including aliases, html, and a raw appId overwrite", async () => {
    const client = new Peak("pk_test_123");
    const bodies: Array<Record<string, unknown>> = [];
    mock.onPost("https://api.peak.fo/solve").reply((config) => {
      bodies.push(JSON.parse(config.data as string) as Record<string, unknown>);
      return [
        200,
        {
          success: true,
          data: {
            cookies: { cf_clearance: "clearance_val" },
            headers: { "user-agent": "Mozilla/5.0 Windows" },
            attributes: { md: "md_val", r: "r_val" },
            cf_rt: "challenge_tok",
          },
        },
      ];
    });

    const res = await client.solveCloudflare5s({
      url: "https://example.com",
      proxy: "http://user:pass@1.2.3.4:8080",
      userAgent: "Mozilla/5.0 Windows",
      html: "<html></html>",
    });
    expect(res.cookies.cf_clearance).toBe("clearance_val");
    expect(res.cf_rt).toBe("challenge_tok");
    expect(bodies[0]).toMatchObject({
      appId: APP_ID,
      task_type: "cloudflare5stask",
      url: "https://example.com/",
      user_agent: "Mozilla/5.0 Windows",
      html: "<html></html>",
    });

    await client.solveCloudflareWaf({
      url: "https://example.com/",
      proxy: "http://user:pass@1.2.3.4:8080",
    });
    await client.solveCloudFlareWAF({
      url: "https://example.com/",
      proxy: "http://user:pass@1.2.3.4:8080",
      taskType: " cloudflare5stask ",
    });
    expect(bodies[1]?.user_agent).toBeUndefined();
    expect(bodies[2]?.task_type).toBe("cloudflare5stask");

    const hooks: string[] = [];
    await client.solve(
      { task_type: "turnstiletask", url: "https://example.com/", appId: "app_other" },
      { onResult: () => hooks.push("call") },
    );
    expect(bodies[3]?.appId).toBe(APP_ID);
    expect(hooks).toEqual(["call"]);
  });

  it("solves AWS WAF for ios and android and validates the task", async () => {
    const client = new Peak("pk_test_123");
    const bodies: Array<Record<string, unknown>> = [];
    mock.onPost("https://api.peak.fo/solve").reply((config) => {
      bodies.push(JSON.parse(config.data as string) as Record<string, unknown>);
      return [200, { success: true, data: { token: "aws-token" } }];
    });

    const ios = await client.solveAwsWaf({
      url: "https://app.example.com",
      sdkUrl: "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
      proxy: "http://user:pass@1.2.3.4:8080",
      userAgent: "ExampleApp/1.0 (iOS 17.0)",
    });
    expect(ios.token).toBe("aws-token");
    expect(bodies[0]).toMatchObject({
      task_type: "awswaftask",
      os: "ios",
      sdk_url: "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
      url: "https://app.example.com/",
      appId: APP_ID,
    });

    await client.solveAWSWAF({
      url: "https://app.example.com/",
      sdkUrl: "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
      proxy: { protocol: "socks5", host: "10.0.0.1", port: 1080 },
      userAgent: "ExampleApp/1.0 (Android 14)",
      os: "android",
    });
    expect(bodies[1]?.os).toBe("android");
    expect(bodies[1]?.proxy).toBe("socks5://10.0.0.1:1080");

    await expect(
      client.solveAwsWaf({
        url: "https://app.example.com/",
        sdkUrl: "https://sdk.example/a",
        proxy: "http://1.2.3.4:8080",
        userAgent: "App",
        os: "windows" as "ios",
      }),
    ).rejects.toThrow(BadRequestError);
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "  " }),
    ).rejects.toThrow(/sitekey/);
    await expect(
      client.solveCloudflare5s({ url: "notaurl", proxy: "http://1.2.3.4:1" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("maps HTTP statuses and solve failures onto error subclasses", async () => {
    const client = new Peak("pk_bad");
    mock.onGet("https://api.peak.fo/balance").replyOnce(401, {
      success: false,
      error: "API key invalid",
    });
    await expect(client.getBalance()).rejects.toMatchObject({
      status: 401,
      message: "API key invalid",
    });

    mock.onPost("https://api.peak.fo/solve").replyOnce(402, {
      success: false,
      error: "insufficient balance",
    });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);

    mock.onPost("https://api.peak.fo/solve").replyOnce(400, {
      success: false,
      error: "missing field",
    });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).rejects.toBeInstanceOf(BadRequestError);

    mock.onPost("https://api.peak.fo/solve").replyOnce(429, { error: "rate limit" });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).rejects.toMatchObject({ status: 429 });

    mock.onPost("https://api.peak.fo/solve").replyOnce(502, "upstream down");
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).rejects.toBeInstanceOf(UpstreamError);

    mock.onPost("https://api.peak.fo/solve").replyOnce(503, {
      success: false,
      error: "temporarily unavailable",
    });
    await expect(
      client.solveAwsWaf({
        url: "https://app.example.com/",
        sdkUrl: "https://sdk.example/a",
        proxy: "http://1.2.3.4:8080",
        userAgent: "App/1",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);

    mock.onPost("https://api.peak.fo/solve").replyOnce(200, {
      success: false,
      error: "Sitekey invalid or domain mismatch",
    });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "bad" }),
    ).rejects.toThrow("Sitekey invalid or domain mismatch");

    mock.onPost("https://api.peak.fo/solve").replyOnce(200, {
      success: true,
      error: "Turnstile challenge was flagged",
    });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).rejects.toBeInstanceOf(SolveError);

    mock.onPost("https://api.peak.fo/solve").replyOnce(200, { success: true });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).rejects.toThrow("Missing response data from Peak API");

    mock.onPost("https://api.peak.fo/solve").replyOnce(200, {
      success: false,
      error: "task type is disabled",
    });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).rejects.toBeInstanceOf(TaskDisabledError);

    mock.onGet("https://api.peak.fo/balance").replyOnce(200, "nope");
    await expect(client.getBalance()).rejects.toThrow(/non-JSON/);

    mock.onGet("https://api.peak.fo/balance").networkError();
    await expect(client.getBalance()).rejects.toMatchObject({
      code: PeakErrorCode.NETWORK,
    });
  });

  it("retries retryable failures and stops on auth, budget, and delay", async () => {
    const client = new Peak({
      apiKey: "pk_test_123",
      retries: 1,
      retryDelayMs: 0,
    });
    let calls = 0;
    mock.onPost("https://api.peak.fo/solve").reply(() => {
      calls += 1;
      if (calls === 1) {
        return [503, { success: false, error: "no solver capacity" }];
      }
      return [200, { success: true, data: { token: "later" } }];
    });
    await expect(
      client.solveTurnstile({ url: "https://example.com/", sitekey: "0x4" }),
    ).resolves.toEqual({ token: "later" });
    expect(calls).toBe(2);

    mock.reset();
    let authCalls = 0;
    mock.onGet("https://api.peak.fo/balance").reply(() => {
      authCalls += 1;
      return [401, { success: false, error: "unauthorized" }];
    });
    const retrying = new Peak({ apiKey: "pk", retries: 4, retryDelayMs: 0 });
    await expect(retrying.getBalance()).rejects.toBeInstanceOf(AuthenticationError);
    expect(authCalls).toBe(1);

    mock.reset();
    let budgetCalls = 0;
    mock.onGet("https://api.peak.fo/balance").reply(() => {
      budgetCalls += 1;
      return [503, { success: false, error: "down" }];
    });
    const budget = new Peak({
      apiKey: "pk",
      retries: 5,
      retryDelayMs: 0,
      retryTimeoutMs: 0,
    });
    await expect(budget.getBalance()).rejects.toBeInstanceOf(RetryTimeoutError);
    expect(budgetCalls).toBe(1);

    const slow = new Peak({ apiKey: "pk", retryDelayMs: 30, retryTimeoutMs: 15 });
    await expect(
      slow.getBalance({ retries: 2, retryDelayMs: 30, retryTimeoutMs: 15 }),
    ).rejects.toBeInstanceOf(RetryTimeoutError);
  });

  it("uses a custom axios instance and reports transport failures", async () => {
    const instance = axios.create({ baseURL: "https://custom.test" });
    const local = new MockAdapter(instance);
    local.onGet("/balance").reply(200, {
      success: true,
      data: { type: "pay_per_solve", balance: 1 },
    });
    const client = new Peak({ apiKey: "pk", axios: instance, httpProxy: undefined });
    await expect(client.getBalance()).resolves.toEqual({
      type: "pay_per_solve",
      balance: 1,
    });
    local.restore();

    const timeoutInstance = axios.create({ baseURL: "https://api.peak.fo" });
    const timeoutMock = new MockAdapter(timeoutInstance);
    timeoutMock.onGet("/balance").timeout();
    const timeoutClient = new Peak({ apiKey: "pk", axios: timeoutInstance });
    await expect(timeoutClient.getBalance()).rejects.toMatchObject({
      code: PeakErrorCode.REQUEST_TIMED_OUT,
    });
    timeoutMock.restore();

    const broken = {
      request: async () => {
        throw "boom";
      },
    } as unknown as AxiosInstance;
    const brokenClient = new Peak({ apiKey: "pk", axios: broken });
    await expect(brokenClient.getBalance()).rejects.toThrow("Unknown request error");

    const exploding = {
      request: async () => {
        throw new Error("disk full");
      },
    } as unknown as AxiosInstance;
    await expect(new Peak({ apiKey: "pk", axios: exploding }).getBalance()).rejects.toThrow(
      "disk full",
    );
  });

  it("invokes both result hooks and skips them when the solve fails", async () => {
    const events: string[] = [];
    const client = new Peak({
      apiKey: "pk",
      onResult: () => events.push("client"),
    });
    mock.onPost("https://api.peak.fo/solve").replyOnce(200, {
      success: false,
      error: "Proxy connection failed",
    });
    await expect(
      client.solveTurnstile({
        url: "https://example.com/",
        sitekey: "0x4",
        onResult: () => events.push("call"),
      }),
    ).rejects.toBeInstanceOf(SolveError);
    expect(events).toEqual([]);

    mock.onPost("https://api.peak.fo/solve").replyOnce(200, {
      success: true,
      data: { token: "ok" },
    });
    await client.solveTurnstile({
      url: "https://example.com/",
      sitekey: "0x4",
      onResult: (event) => events.push(event.taskType),
    });
    expect(events).toEqual(["TurnstileTaskProxyLess", "client"]);
  });

  it("exposes response data on PeakError", async () => {
    const client = new Peak("pk");
    mock.onGet("https://api.peak.fo/balance").reply(500, { error: "" });
    try {
      await client.getBalance();
      throw new Error("should have failed");
    } catch (err) {
      expect(err).toBeInstanceOf(PeakError);
      const peakErr = err as PeakError;
      expect(peakErr.response).toEqual({ error: "" });
      expect(peakErr.status).toBe(500);
    }
  });
});
