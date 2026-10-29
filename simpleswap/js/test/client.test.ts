import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  DEFAULT_USER_AGENT,
  ExchangeStatus,
  SIMPLESWAP_API_KEY_HEADER,
  SimpleSwap,
  SimpleSwapAuthError,
  SimpleSwapBadRequestError,
  SimpleSwapError,
  SimpleSwapForbiddenError,
  SimpleSwapNetworkError,
  SimpleSwapNotFoundError,
  SimpleSwapRateLimitError,
  SimpleSwapServerError,
  SimpleSwapTimeoutError,
  SimpleSwapValidationError,
  exchangeId,
  parseRetryAfter,
} from "../src/index.js";

describe("SimpleSwap client", () => {
  let mock: MockAdapter;
  let client: SimpleSwap;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new SimpleSwap({ apiKey: "test-simpleswap-key", maxRetries: 0 });
  });

  afterEach(() => {
    mock.restore();
  });

  test("sends x-api-key header on requests", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    mock.onGet("/v3/currencies").reply((config) => {
      capturedHeaders = config.headers as Record<string, string>;
      return [200, { traceId: "trace_1", result: [{ ticker: "btc", network: "btc", name: "Bitcoin" }] }];
    });

    const res = await client.getCurrencies();
    expect(res).toHaveLength(1);
    expect(capturedHeaders?.[SIMPLESWAP_API_KEY_HEADER]).toBe("test-simpleswap-key");
    expect(capturedHeaders?.["User-Agent"]).toBe(DEFAULT_USER_AGENT);
    expect(capturedHeaders?.["x-user-agent"]).toBe(DEFAULT_USER_AGENT);
  });

  test("getCurrency fetches a single currency by ticker and network", async () => {
    mock.onGet("/v3/currencies/btc/btc").reply(200, {
      traceId: "trace_2",
      result: { ticker: "btc", network: "btc", name: "Bitcoin" },
    });

    const btc = await client.getCurrency("btc", "btc");
    expect(btc.name).toBe("Bitcoin");
  });

  test("getEstimate queries rate and passes customFee", async () => {
    let capturedParams: Record<string, unknown> | undefined;
    mock.onGet("/v3/estimates").reply((config) => {
      capturedParams = config.params;
      return [200, { traceId: "trace_3", result: { estimatedAmount: "3.45", rateId: null, validUntil: null } }];
    });

    const estimate = await client.getEstimate({
      tickerFrom: "btc",
      tickerTo: "eth",
      networkFrom: "btc",
      networkTo: "eth",
      amount: "0.1",
      customFee: 0.8,
    });

    expect(estimate.estimatedAmount).toBe("3.45");
    expect(capturedParams?.customFee).toBe("0.8");
    expect(capturedParams?.amount).toBe("0.1");
  });

  test("getRanges returns deposit bounds", async () => {
    mock.onGet("/v3/ranges").reply(200, {
      traceId: "trace_4",
      result: { min: "0.001", max: "10.0" },
    });

    const ranges = await client.getRanges({ tickerFrom: "btc", tickerTo: "eth" });
    expect(ranges.min).toBe("0.001");
    expect(ranges.max).toBe("10.0");
  });

  test("checkExchange returns canCreate boolean", async () => {
    mock.onGet("/v3/exchanges/check").reply(200, {
      traceId: "trace_5",
      result: { canCreate: true },
    });

    const check = await client.checkExchange({ tickerFrom: "btc", tickerTo: "eth", amount: "0.1" });
    expect(check.canCreate).toBe(true);
  });

  test("createExchange posts order payload with customFee", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/v3/exchanges").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [
        200,
        {
          traceId: "trace_6",
          result: {
            id: "ex_100",
            status: "waiting",
            tickerFrom: "btc",
            tickerTo: "eth",
            amountFrom: "0.1",
            amountTo: "3.45",
            addressFrom: "1BtcDepositAddress",
            addressTo: "0xEthReceiveAddress",
          },
        },
      ];
    });

    const order = await client.createExchange({
      tickerFrom: "btc",
      tickerTo: "eth",
      amount: "0.1",
      addressTo: "0xEthReceiveAddress",
      customFee: 0.5,
    });

    expect(order.id).toBe("ex_100");
    expect(order.addressFrom).toBe("1BtcDepositAddress");
    expect(capturedBody?.customFee).toBe(0.5);
  });

  test("getExchange and getExchanges query exchange history", async () => {
    mock.onGet("/v3/exchanges/ex_100").reply(200, {
      traceId: "trace_7",
      result: { id: "ex_100", status: "finished" },
    });
    let params: Record<string, unknown> | undefined;
    mock.onGet("/v3/exchanges").reply((config) => {
      params = config.params;
      return [200, { traceId: "trace_8", result: [{ id: "ex_100", status: "finished" }] }];
    });

    const single = await client.getExchange("ex_100");
    expect(single.status).toBe("finished");

    const list = await client.getExchanges({
      limit: 10,
      offset: 5,
      startDate: "2024-01-01T00:00:00.000Z",
      finishDate: "2024-02-01T00:00:00.000Z",
    });
    expect(list).toHaveLength(1);
    expect(params).toMatchObject({
      limit: 10,
      offset: 5,
      startDate: "2024-01-01T00:00:00.000Z",
      finishDate: "2024-02-01T00:00:00.000Z",
    });
  });

  test("throws SimpleSwapError when error: true is returned", async () => {
    mock.onGet("/v3/estimates").reply(200, {
      traceId: "trace_err",
      error: true,
      message: "Pair is disabled",
    });

    await expect(client.getEstimate({ tickerFrom: "btc", tickerTo: "eth", amount: 0.1 })).rejects.toMatchObject({
      message: "Pair is disabled",
      traceId: "trace_err",
      name: "SimpleSwapError",
    });
  });

  test("throws SimpleSwapError on HTTP 401 unauthorized", async () => {
    mock.onGet("/v3/currencies").reply(401, {
      traceId: "trace_unauth",
      message: "API key is invalid",
      code: 401,
    });

    await expect(client.getCurrencies()).rejects.toBeInstanceOf(SimpleSwapAuthError);
  });

  test("maps HTTP error statuses onto error subclasses", async () => {
    mock.onGet("/v3/ranges").reply(400, { message: "Amount is below the minimum", traceId: "t400" });
    mock.onGet("/v3/currencies/missing/missing").reply(403, { message: "Forbidden" });
    mock.onGet("/v3/exchanges/missing").reply(404, { message: "Exchange not found" });
    mock.onPost("/v3/exchanges").reply(422, { message: "Address is invalid" });
    mock.onGet("/v3/market").reply(500, { message: "Internal error" });
    mock.onGet("/v3/pairs").reply(502, "bad gateway");

    await expect(client.getRanges({ tickerFrom: "btc", tickerTo: "eth" })).rejects.toBeInstanceOf(
      SimpleSwapBadRequestError
    );
    await expect(client.getCurrency("missing", "missing")).rejects.toBeInstanceOf(SimpleSwapForbiddenError);
    await expect(client.getExchange("missing")).rejects.toBeInstanceOf(SimpleSwapNotFoundError);
    await expect(
      client.createExchange({ tickerFrom: "btc", tickerTo: "eth", amount: "1", addressTo: "bad" })
    ).rejects.toBeInstanceOf(SimpleSwapValidationError);
    await expect(client.getMarket()).rejects.toBeInstanceOf(SimpleSwapServerError);
    await expect(client.getAllPairs()).rejects.toMatchObject({ message: "bad gateway" });
  });

  test("treats a string error envelope without result as a failure", async () => {
    mock.onGet("/v3/pairs/btc/btc").reply(200, { error: "Not Found", message: "", traceId: "nf" });
    await expect(client.getPairs("btc", "btc")).rejects.toMatchObject({ message: "Not Found", traceId: "nf" });
  });

  test("returns result when a string error field is present beside result", async () => {
    mock.onGet("/v3/market").reply(200, { error: "ignored", result: [{ tickerFrom: "btc" }] });
    const rows = await client.getMarketInfo();
    expect(rows).toHaveLength(1);
  });

  test("returns an unwrapped payload and a null body", async () => {
    mock.onGet("/v3/currencies").replyOnce(200, [{ ticker: "eth", network: "eth", name: "Ethereum" }]);
    await expect(client.getAllCurrencies()).resolves.toHaveLength(1);
    mock.onGet("/v3/currencies").replyOnce(200, null);
    await expect(client.getCurrencies()).resolves.toBeNull();
  });

  test("uses the default message when the error envelope has none", async () => {
    mock.onGet("/v3/estimates").reply(200, { error: true });
    await expect(client.getEstimated({ tickerFrom: "btc", tickerTo: "eth", amount: 1 })).rejects.toThrow(
      "SimpleSwap error"
    );
  });

  test("encodes path segments and sends pair, estimate, range, and check flags", async () => {
    let estimateParams: Record<string, unknown> | undefined;
    let rangeParams: Record<string, unknown> | undefined;
    let checkParams: Record<string, unknown> | undefined;
    mock.onGet("/v3/currencies/b%2Ftc/e%20th").reply(200, { result: { ticker: "b/tc", name: "Slash" } });
    mock.onGet("/v3/pairs").reply(200, { result: { "btc:btc": ["eth:eth"] } });
    mock.onGet("/v3/pairs/btc/btc").reply((config) => {
      estimateParams = config.params;
      return [200, { result: { "btc:btc": ["usdt:trx"] } }];
    });
    mock.onGet("/v3/estimates").reply((config) => {
      estimateParams = config.params;
      return [200, { result: { estimatedAmount: "1" } }];
    });
    mock.onGet("/v3/ranges").reply((config) => {
      rangeParams = config.params;
      return [200, { result: { min: "0.01", max: null } }];
    });
    mock.onGet("/v3/exchanges/check").reply((config) => {
      checkParams = config.params;
      return [200, { result: false }];
    });

    await expect(client.getCurrency("b/tc", "e th")).resolves.toMatchObject({ name: "Slash" });
    await expect(client.getPairs()).resolves.toEqual({ "btc:btc": ["eth:eth"] });
    await expect(client.getPairs("btc", "btc", { fixed: true })).resolves.toEqual({ "btc:btc": ["usdt:trx"] });
    await client.getEstimate({
      tickerFrom: "btc",
      tickerTo: "eth",
      amount: 0,
      fixed: false,
      reverse: true,
      customFee: 0,
    });
    expect(estimateParams).toMatchObject({ fixed: false, reverse: true, customFee: "0", amount: "0" });
    await client.getRanges({ tickerFrom: "btc", tickerTo: "eth", networkFrom: "btc", fixed: true, reverse: false });
    expect(rangeParams).toMatchObject({ networkFrom: "btc", fixed: true, reverse: false });
    await expect(client.getMin({ tickerFrom: "btc", tickerTo: "eth" })).resolves.toBe("0.01");
    await expect(client.checkExchange({ tickerFrom: "btc", tickerTo: "eth", amount: 1, fixed: true })).resolves.toEqual(
      { canCreate: false }
    );
    expect(checkParams).toMatchObject({ fixed: true, amount: "1" });
  });

  test("getPairs rejects a ticker without a network", async () => {
    await expect(client.getPairs("btc")).rejects.toThrow(/both ticker and network/);
  });

  test("getMin returns null when the ranges payload has no min field", async () => {
    mock.onGet("/v3/ranges").reply(200, { result: "0.01" });
    await expect(client.getMin({ tickerFrom: "btc", tickerTo: "eth" })).resolves.toBeNull();
  });

  test("createExchange and confirmExchange send the documented bodies", async () => {
    const bodies: unknown[] = [];
    mock.onPost("/v3/exchanges").reply((config) => {
      bodies.push(JSON.parse(config.data));
      return [200, { result: { id: "ex", publicId: "pub", status: "waiting" } }];
    });
    mock.onPut("/v3/exchanges").reply((config) => {
      bodies.push(JSON.parse(config.data));
      return [200, { result: { id: "ex", publicId: "pub", status: "confirming" } }];
    });

    await client.createExchange({
      tickerFrom: "btc",
      tickerTo: "xrp",
      networkFrom: "btc",
      networkTo: "xrp",
      amount: "0.2",
      addressTo: "rDest",
      fixed: true,
      reverse: false,
      extraIdTo: "memo",
      userRefundAddress: "refund",
      userRefundExtraId: "refund-memo",
      rateId: "rate-1",
      customFee: null,
    });
    await client.confirmExchange({
      publicId: "pub",
      txFrom: "tx",
      providerUserDepositAddress: "dep",
      targetAddress: "target",
    });

    expect(bodies[0]).toMatchObject({
      fixed: true,
      reverse: false,
      extraIdTo: "memo",
      userRefundAddress: "refund",
      userRefundExtraId: "refund-memo",
      rateId: "rate-1",
    });
    expect(bodies[0]).not.toHaveProperty("customFee");
    expect(bodies[1]).toEqual({
      publicId: "pub",
      txFrom: "tx",
      providerUserDepositAddress: "dep",
      targetAddress: "target",
    });
    expect(exchangeId({ publicId: "pub", id: "ex" })).toBe("pub");
    expect(exchangeId({ id: "ex" })).toBe("ex");
    expect(() => exchangeId(undefined)).toThrow(SimpleSwapError);
  });

  test("omits a null custom fee from estimates", async () => {
    let captured: Record<string, unknown> | undefined;
    mock.onGet("/v3/estimates").reply((config) => {
      captured = config.params;
      return [200, { result: { estimatedAmount: "1" } }];
    });
    await client.getEstimate({ tickerFrom: "btc", tickerTo: "eth", amount: "1", customFee: null });
    expect(captured).not.toHaveProperty("customFee");
  });

  test("retries safe GET failures and does not repeat create on server errors", async () => {
    const retrying = new SimpleSwap({ apiKey: "k", maxRetries: 1, retryDelayMs: 1 });
    mock.onGet("/v3/currencies").replyOnce(503, { message: "unavailable" }).onGet("/v3/currencies").reply(200, {
      result: [{ ticker: "btc", name: "Bitcoin" }],
    });
    await expect(retrying.getCurrencies()).resolves.toHaveLength(1);

    mock.reset();
    let posts = 0;
    mock.onPost("/v3/exchanges").reply(() => {
      posts += 1;
      return [503, { message: "down" }];
    });
    await expect(
      retrying.createExchange({ tickerFrom: "btc", tickerTo: "eth", amount: "1", addressTo: "dest" })
    ).rejects.toBeInstanceOf(SimpleSwapServerError);
    expect(posts).toBe(1);

    mock.reset();
    mock.onPost("/v3/exchanges").replyOnce(429, { message: "slow" }, { "retry-after": "0" });
    mock.onPost("/v3/exchanges").reply(200, { result: { id: "ok", status: "waiting" } });
    await expect(
      retrying.createExchange({ tickerFrom: "btc", tickerTo: "eth", amount: "1", addressTo: "dest" })
    ).resolves.toMatchObject({ id: "ok" });
  });

  test("retries network errors on GET and stops when retries are exhausted", async () => {
    const retrying = new SimpleSwap({ apiKey: "k", maxRetries: 1, retryDelayMs: 0 });
    mock.onGet("/v3/market").networkErrorOnce();
    mock.onGet("/v3/market").reply(200, { result: [] });
    await expect(retrying.getMarket()).resolves.toEqual([]);

    mock.onGet("/v3/pairs").reply(500, { message: "still down" });
    await expect(retrying.getPairs()).rejects.toBeInstanceOf(SimpleSwapServerError);

    const once = new SimpleSwap({ apiKey: "k", maxRetries: 0 });
    mock.onPost("/v3/exchanges").networkError();
    await expect(
      once.createExchange({ tickerFrom: "btc", tickerTo: "eth", amount: "1", addressTo: "dest" })
    ).rejects.toBeInstanceOf(SimpleSwapNetworkError);
  });

  test("honors Retry-After and falls back when the header is not a delay", async () => {
    const retrying = new SimpleSwap({ apiKey: "k", maxRetries: 1, retryDelayMs: 5_000 });
    mock
      .onGet("/v3/currencies")
      .replyOnce(429, { message: "slow", traceId: "rl" }, { "retry-after": "0" });
    mock.onGet("/v3/currencies").replyOnce(200, { result: [] });
    await expect(retrying.getCurrencies()).resolves.toEqual([]);

    const fallback = new SimpleSwap({ apiKey: "k", maxRetries: 1, retryDelayMs: 0 });
    mock.onGet("/v3/market").replyOnce(429, { message: "slow" }, { "retry-after": "nope" });
    mock.onGet("/v3/market").replyOnce(200, { result: [{ rate: "1" }] });
    await expect(fallback.getMarket()).resolves.toHaveLength(1);

    const dated = new SimpleSwap({ apiKey: "k", maxRetries: 1, retryDelayMs: 5_000 });
    mock
      .onGet("/v3/pairs")
      .replyOnce(429, { message: "slow" }, { "retry-after": "Tue, 15 Nov 1994 08:12:31 GMT" });
    mock.onGet("/v3/pairs").replyOnce(200, { result: {} });
    await expect(dated.getAllPairs()).resolves.toEqual({});

    mock.reset();
    mock.onGet("/v3/currencies").reply(429, { message: "slow" });
    const limited = new SimpleSwap({ apiKey: "k", maxRetries: 0 });
    await expect(limited.getCurrencies()).rejects.toBeInstanceOf(SimpleSwapRateLimitError);
  });

  test("waitForExchange polls, times out, and aborts", async () => {
    const updates: string[] = [];
    mock
      .onGet("/v3/exchanges/ex_1")
      .replyOnce(200, { result: { id: "ex_1", status: ExchangeStatus.Waiting } })
      .onGet("/v3/exchanges/ex_1")
      .reply(200, { result: { id: "ex_1", status: ExchangeStatus.Finished } });
    await expect(
      client.waitForExchange("ex_1", {
        timeoutMs: 5_000,
        intervalMs: 0,
        onUpdate: (order) => updates.push(order.status),
      })
    ).resolves.toMatchObject({ status: "finished" });
    expect(updates).toEqual(["waiting", "finished"]);

    mock.onGet("/v3/exchanges/ex_2").reply(200, { result: { id: "ex_2", status: "confirming" } });
    await expect(client.waitForExchange("ex_2", { timeoutMs: 0, intervalMs: 0 })).rejects.toBeInstanceOf(
      SimpleSwapTimeoutError
    );
    await expect(
      client.waitForExchange("ex_2", { timeoutMs: 5_000, intervalMs: 0, statuses: ["confirming"] })
    ).resolves.toMatchObject({ status: "confirming" });

    const controller = new AbortController();
    controller.abort();
    await expect(client.waitForExchange("ex_2", { signal: controller.signal, timeoutMs: 5_000 })).rejects.toMatchObject(
      { code: "ABORTED" }
    );

    const mid = new AbortController();
    mock.onGet("/v3/exchanges/ex_3").reply(200, { result: { id: "ex_3", status: "waiting" } });
    await expect(
      client.waitForExchange("ex_3", {
        timeoutMs: 5_000,
        intervalMs: 10_000,
        signal: mid.signal,
        onUpdate: () => mid.abort(),
      })
    ).rejects.toMatchObject({ code: "ABORTED" });
  });

  test("validates addresses locally", () => {
    const pattern = "^(0x)[0-9A-Fa-f]{40}$";
    expect(client.isValidAddress(`0x${"a".repeat(40)}`, pattern)).toBe(true);
    expect(client.isValidAddress("bc1noteth", pattern)).toBe(false);
    expect(client.isValidAddress("  ", pattern)).toBe(false);
    expect(client.isValidAddress("anywhere", null)).toBe(true);
    expect(client.isValidAddress("anywhere", { ticker: "btc", network: "btc", name: "Bitcoin" })).toBe(true);
    expect(
      client.isValidAddress("0xabc", {
        ticker: "eth",
        network: "eth",
        name: "Ethereum",
        validationAddress: pattern,
      })
    ).toBe(false);
    expect(() => client.isValidAddress("abc", "(")).toThrow(SimpleSwapError);
  });

  test("reads configuration aliases, the environment, and proxy settings", async () => {
    const previous = process.env.SIMPLESWAP_API_KEY;
    process.env.SIMPLESWAP_API_KEY = "from-env";
    try {
      const fromEnv = new SimpleSwap({ userAgent: "", baseUrl: "https://example.test/api/", timeout: 1234 });
      const http = (fromEnv as unknown as { http: { defaults: { baseURL: string; timeout: number; headers: Record<string, string> } } }).http;
      expect(http.defaults.baseURL).toBe("https://example.test/api");
      expect(http.defaults.timeout).toBe(1234);
      expect(http.defaults.headers[SIMPLESWAP_API_KEY_HEADER]).toBe("from-env");

      const explicit = new SimpleSwap({
        apiKey: "",
        baseURL: "https://override.example/",
        clientIp: "203.0.113.8",
        proxy: "http://user:p%40ss@127.0.0.1:8888",
        maxRetries: Number.NaN,
        retryDelayMs: -5,
        pollingIntervalMs: -1,
        pollingTimeoutMs: 10,
      });
      const inner = explicit as unknown as {
        http: { defaults: { baseURL: string; proxy: { host: string; port: number; auth: { password: string } } } };
        maxRetries: number;
        retryDelayMs: number;
        pollingIntervalMs: number;
        apiKey?: string;
      };
      expect(inner.http.defaults.baseURL).toBe("https://override.example");
      expect(inner.http.defaults.proxy).toMatchObject({
        host: "127.0.0.1",
        port: 8888,
        auth: { username: "user", password: "p@ss" },
      });
      expect(inner.maxRetries).toBe(2);
      expect(inner.retryDelayMs).toBe(0);
      expect(inner.pollingIntervalMs).toBe(0);
      expect(inner.apiKey).toBe("from-env");

      delete process.env.SIMPLESWAP_API_KEY;
      const anonymous = new SimpleSwap({ apiKey: "", maxRetries: -3 });
      const anon = anonymous as unknown as { apiKey?: string; maxRetries: number };
      expect(anon.apiKey).toBeUndefined();
      expect(anon.maxRetries).toBe(0);
      expect(() => new SimpleSwap({ proxy: "not a url" })).toThrow(/Invalid proxy URL/);
      expect(() => new SimpleSwap({ proxy: "http:///" })).toThrow(/Invalid proxy URL/);
    } finally {
      if (previous === undefined) {
        delete process.env.SIMPLESWAP_API_KEY;
      } else {
        process.env.SIMPLESWAP_API_KEY = previous;
      }
    }
  });
});

describe("parseRetryAfter", () => {
  test("parses seconds, http dates, arrays, and invalid values", () => {
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter("  ")).toBeUndefined();
    expect(parseRetryAfter("nope")).toBeUndefined();
    expect(parseRetryAfter(["1.5"])).toBe(1500);
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter("Tue, 15 Nov 1994 08:12:31 GMT", Date.parse("Tue, 15 Nov 1994 08:12:31 GMT") + 5000)).toBe(0);
    expect(parseRetryAfter("Tue, 15 Nov 2099 08:12:31 GMT", 0)).toBeGreaterThan(0);
  });
});
