import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  ChangeNow,
  ChangeNowAmountError,
  ChangeNowAuthError,
  ChangeNowError,
  ChangeNowNetworkError,
  ChangeNowNotFoundError,
  ChangeNowRateLimitError,
  ChangeNowServerError,
  ChangeNowTimeoutError,
  ChangeNowValidationError,
  buildExchangeLink,
  isTerminalExchangeStatus,
  parseExchangeWebhook,
  splitAssetId,
} from "../src/index.js";

describe("ChangeNOW extended client", () => {
  let mock: MockAdapter;
  let client: ChangeNow;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new ChangeNow({
      apiKey: "test-changenow-key",
      retries: 2,
      retryDelayMs: 0,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test("link helpers, asset ids, and webhook parsing", () => {
    expect(splitAssetId("usdt.trx")).toEqual({ currency: "usdt", network: "trx" });
    expect(splitAssetId("btc")).toEqual({ currency: "btc", network: "btc" });
    expect(splitAssetId(".eth")).toEqual({ currency: ".eth", network: ".eth" });
    expect(isTerminalExchangeStatus("finished")).toBe(true);
    expect(isTerminalExchangeStatus("waiting")).toBe(false);
    expect(isTerminalExchangeStatus(null)).toBe(false);

    const link = buildExchangeLink({
      from: "btc",
      to: "eth",
      amount: "0.1",
      fixedRate: true,
      fiatMode: false,
      lang: "en",
      recipientAddress: "0xabc",
      utmSource: "wallet",
    });
    expect(link).toBe(
      "https://changenow.io/exchange?from=btc&to=eth&amount=0.1&fixedRate=true&recipientAddress=0xabc&utm_source=wallet"
    );
    expect(buildExchangeLink({ from: "usd", to: "btc", amount: 10, fiatMode: true, lang: "de" })).toContain(
      "https://changenow.io/de/exchange?"
    );
    expect(
      buildExchangeLink({
        from: "btc",
        to: "xrp",
        amountTo: "25",
        recipientExtraId: "123",
        backupAddress: "bc1qrefund",
        utmMedium: "app",
        utmCampaign: "spring",
        utmContent: "banner",
        utmTerm: "xrp",
      })
    ).toContain("amountTo=25");
    expect(() => buildExchangeLink({ from: "", to: "eth" })).toThrow(ChangeNowValidationError);

    expect(parseExchangeWebhook({ id: "ex-1", status: "waiting" }).id).toBe("ex-1");
    expect(parseExchangeWebhook({ requestId: "req-1" }).id).toBe("req-1");
    expect(() => parseExchangeWebhook(null)).toThrow(ChangeNowValidationError);
    expect(() => parseExchangeWebhook([])).toThrow(ChangeNowValidationError);
    expect(() => parseExchangeWebhook({ status: "waiting" })).toThrow(ChangeNowValidationError);
    expect(() => parseExchangeWebhook({ id: "ex-1", status: 1 })).toThrow(ChangeNowValidationError);
  });

  test("rejects an invalid proxy URL before any request", () => {
    expect(() => new ChangeNow({ proxy: "not a url" })).toThrow(ChangeNowError);
    const proxied = new ChangeNow({ proxy: "http://user:p%40ss@127.0.0.1:8888" });
    expect(proxied).toBeInstanceOf(ChangeNow);
  });

  test("retries a GET on 503 and honors Retry-After", async () => {
    mock
      .onGet("/exchange/by-id")
      .replyOnce(503, { message: "unavailable", error: "UPSTREAM_UNAVAILABLE" }, { "retry-after": "0" })
      .onGet("/exchange/by-id")
      .reply(200, { id: "ex-1", status: "waiting" });

    const status = await client.getExchange("ex-1");
    expect(status.status).toBe("waiting");
  });

  test("does not retry POST creates", async () => {
    mock.onPost("/exchange").reply(500, { message: "down" });
    await expect(
      client.createExchange({ fromCurrency: "btc", toCurrency: "eth", address: "0xabc", fromAmount: "1" })
    ).rejects.toBeInstanceOf(ChangeNowServerError);
    expect(mock.history.post).toHaveLength(1);
  });

  test("retries unsafe POST when asked and surfaces network errors", async () => {
    const unsafe = new ChangeNow({ apiKey: "test-changenow-key", retries: 1, retryDelayMs: 0, retryUnsafe: true });
    mock.onPost("/exchange/continue").networkErrorOnce();
    mock.onPost("/exchange/continue").reply(200, { result: true });
    const pushed = await unsafe.continueExchange({ id: "ex-1" });
    expect(pushed.result).toBe(true);
  });

  test("maps version-3 field errors, string bodies, and rate limits", async () => {
    mock.onGet("/exchange/min-amount").replyOnce(400, {
      status: 400,
      errors: {
        fromAmount: {
          code: "AMOUNT_OUT_OF_RANGE",
          message: "fromAmount is below the minimum",
          min: "0.01",
          unit: "btc",
        },
      },
      help: "GET /v3/exchange/estimate?help",
    });
    await expect(client.getMinAmount({ fromCurrency: "btc", toCurrency: "eth" })).rejects.toMatchObject({
      name: "ChangeNowAmountError",
      field: "fromAmount",
      code: "AMOUNT_OUT_OF_RANGE",
      help: "GET /v3/exchange/estimate?help",
    });

    mock.onGet("/exchange/min-amount").replyOnce(400, '"plain failure"');
    await expect(client.getMinAmount({ fromCurrency: "btc", toCurrency: "eth" })).rejects.toMatchObject({
      message: "plain failure",
    });

    const once = new ChangeNow({ apiKey: "test-changenow-key", retries: 0 });
    mock.onGet("/exchange/min-amount").replyOnce(429, { message: ["slow", "down"] });
    await expect(once.getMinAmount({ fromCurrency: "btc", toCurrency: "eth" })).rejects.toBeInstanceOf(
      ChangeNowRateLimitError
    );

    mock.onGet("/exchange/range").networkError();
    await expect(client.getRange({ fromCurrency: "btc", toCurrency: "eth" })).rejects.toBeInstanceOf(
      ChangeNowNetworkError
    );
  });

  test("maps auth, forbidden, not found, and catalogue string field errors", async () => {
    mock.onGet("/exchange/by-id").replyOnce(401, { error: "unauthorized", message: "bad key" });
    await expect(client.getExchange("ex-1")).rejects.toBeInstanceOf(ChangeNowAuthError);

    mock.onGet("/exchange/by-id").replyOnce(403, { message: "not enabled" });
    await expect(client.getExchange("ex-1")).rejects.toBeInstanceOf(ChangeNowError);

    const forbidden = new ChangeNow({ apiKey: "k", retries: 0 });
    mock.onGet("/exchange/actions").reply(403, { message: "disabled" });
    await expect(forbidden.getExchangeActions("ex-1")).rejects.toBeInstanceOf(ChangeNowError);

    mock.onGet("https://vip-api.changenow.io/v1/assets/nope").reply(404, {
      status: 404,
      errors: { asset: "No such asset" },
      help: "GET /v1/assets?help",
    });
    await expect(client.getAsset("nope")).rejects.toMatchObject({
      field: "asset",
      message: "No such asset",
      statusCode: 404,
    });
  });

  test("waits for a terminal exchange status and times out", async () => {
    const seen: string[] = [];
    mock
      .onGet("/exchange/by-id")
      .replyOnce(200, { id: "ex-1", status: "waiting" })
      .onGet("/exchange/by-id")
      .replyOnce(200, { id: "ex-1", status: "finished" });

    const done = await client.waitForExchange("ex-1", {
      intervalMs: 0,
      timeoutMs: 5_000,
      onStatus: (status) => seen.push(status),
    });
    expect(done.status).toBe("finished");
    expect(seen).toEqual(["waiting", "finished"]);

    mock.onGet("/exchange/by-id").reply(200, { id: "ex-2", status: "confirming" });
    await expect(
      client.waitForExchange("ex-2", { intervalMs: 0, timeoutMs: 0 })
    ).rejects.toBeInstanceOf(ChangeNowTimeoutError);
  });

  test("covers the anonymous catalogue and version-3 exchange", async () => {
    mock.onGet("https://vip-api.changenow.io/v1/assets").reply((config) => {
      if (config.params?.help === "true") {
        return [200, "catalogue manual"];
      }
      if (config.params?.format === "csv") {
        return [200, "asset,ticker\nbtc.btc,btc\n"];
      }
      if (config.params?.cursor) {
        return [
          200,
          {
            returned: 1,
            total: 2,
            has_more: false,
            next_cursor: null,
            summary: "done",
            assets: [{ asset: "eth.eth", ticker: "eth", name: "Ethereum" }],
          },
        ];
      }
      return [
        200,
        {
          returned: 1,
          total: 2,
          has_more: true,
          next_cursor: "next",
          summary: "more",
          assets: [{ asset: "btc.btc", ticker: "btc", name: "Bitcoin" }],
        },
      ];
    });
    mock.onGet("https://vip-api.changenow.io/v1/assets/btc.btc").reply(200, {
      asset: "btc.btc",
      ticker: "btc",
      network: "btc",
    });
    mock.onGet("https://vip-api.changenow.io/v3/exchange/estimate").reply((config) => {
      if (config.params?.help === "true") {
        return [200, "estimate manual"];
      }
      return [200, { quote: { toAmount: "1.2", rateId: null, provider: "changenow" } }];
    });
    mock.onPost("https://vip-api.changenow.io/v3/transactions").reply((config) => {
      const body = JSON.parse(config.data);
      if (body.help === true) {
        return [200, "create manual"];
      }
      return [201, { id: "041c0026e6e482", payinAddress: "bc1q", addressFormatChecked: true }];
    });
    mock
      .onGet(/\/v3\/transactions\//)
      .replyOnce(200, { id: "041c0026e6e482", status: "waiting" })
      .onGet(/\/v3\/transactions\//)
      .reply(200, { id: "041c0026e6e482", status: "finished", payoutHash: "0xhash" });

    const page = await client.listAssets({ q: "btc", kind: "crypto", popular: true, limit: 1 });
    expect(page.assets[0].ticker).toBe("btc");
    const all = await client.listAllAssets({ q: "btc", limit: 1 });
    expect(all.map((asset) => asset.ticker)).toEqual(["btc", "eth"]);
    expect(await client.listAssets({ format: "csv" })).toContain("btc.btc");
    expect(await client.getAssetManual()).toBe("catalogue manual");
    expect((await client.getAsset("btc.btc")).network).toBe("btc");

    const quote = await client.getPublicEstimate({
      fromCurrency: "btc",
      fromNetwork: "btc",
      toCurrency: "eth",
      toNetwork: "eth",
      fromAmount: "0.1",
      flow: "standard",
      useRateId: false,
    });
    expect(typeof quote).not.toBe("string");
    expect(await client.getPublicManual()).toBe("estimate manual");

    const created = await client.createPublicTransaction({
      fromCurrency: "btc",
      fromNetwork: "btc",
      toCurrency: "eth",
      toNetwork: "eth",
      address: "0xabc",
      fromAmount: "0.1",
      source: "wallet",
      promoCode: "PROMO",
    });
    expect(typeof created).not.toBe("string");
    expect(await client.createPublicTransaction({
      fromCurrency: "btc",
      fromNetwork: "btc",
      toCurrency: "eth",
      toNetwork: "eth",
      address: "0xabc",
      help: true,
    })).toBe("create manual");

    const finished = await client.waitForPublicTransaction("041c0026e6e482", {
      intervalMs: 0,
      timeoutMs: 5_000,
      subId: "leg-1",
    });
    expect(finished.payoutHash).toBe("0xhash");
  });

  test("legacy v1 methods send the partner key as a query and in transaction paths", async () => {
    const anonymous = new ChangeNow({ retries: 0 });
    await expect(anonymous.createTransactionV1({
      from: "btc",
      to: "eth",
      address: "0xabc",
      amount: 0.1,
    })).rejects.toBeInstanceOf(ChangeNowAuthError);

    mock.onGet(/\/v1\/currencies$/).reply(200, [{ ticker: "btc" }]);
    mock.onGet(/\/v1\/currencies-to\/btc/).reply(200, [{ ticker: "eth" }]);
    mock.onGet(/\/v1\/currencies\/btc$/).reply(200, { ticker: "btc", name: "Bitcoin" });
    mock.onGet(/\/v1\/min-amount\//).reply(200, { minAmount: 0.001 });
    mock.onGet(/\/v1\/exchange-amount\/0\.1\//).reply(200, { estimatedAmount: 1.5 });
    mock.onGet(/\/v1\/exchange-range\//).reply(200, { minAmount: 0.001, maxAmount: null });
    mock.onGet(/\/v1\/exchange-amount\/fixed-rate\//).reply(200, { estimatedAmount: 1.4, rateId: "rate-v1" });
    mock.onGet(/\/v1\/market-info\/available-pairs/).reply(200, ["btc_eth"]);
    mock.onGet(/\/v1\/validate\/address/).reply(200, { result: true, message: null });
    mock.onPost(/\/v1\/transactions\/test-changenow-key$/).reply((config) => {
      return [200, { id: "v1-1", payinAddress: "bc1q" }];
    });
    mock.onPost(/\/v1\/transactions\/fixed-rate\//).reply(200, { id: "v1-fixed" });
    mock.onGet(/\/v1\/transactions\/v1-1\//).reply(200, { status: "waiting" });
    mock.onGet(/\/v1\/transactions\/test-changenow-key$/).reply(200, [{ status: "finished" }]);

    expect((await client.getCurrenciesV1({ active: true, fixedRate: true }))[0].ticker).toBe("btc");
    expect((await client.getCurrenciesToV1("btc", { fixedRate: true }))[0].ticker).toBe("eth");
    expect((await client.getCurrencyInfoV1("btc")).name).toBe("Bitcoin");
    expect((await client.getMinAmountV1("btc", "eth")).minAmount).toBe(0.001);
    expect((await client.getExchangeAmountV1(0.1, "btc", "eth")).estimatedAmount).toBe(1.5);
    expect((await client.getExchangeRangeV1("btc", "eth")).maxAmount).toBeNull();
    expect((await client.getFixedRateAmountV1({ amount: "0.1", from: "btc", to: "eth", useRateId: true })).rateId).toBe(
      "rate-v1"
    );
    expect(await client.getMarketPairsV1()).toEqual(["btc_eth"]);
    expect((await client.validateAddressV1("eth", "0xabc")).result).toBe(true);

    const created = await client.createTransactionV1({
      from: "btc",
      to: "eth",
      address: "0xabc",
      amount: "0.1",
      userId: "user-42",
      payload: { campaign: "spring" },
      flow: "standard",
    });
    expect(created.id).toBe("v1-1");
    expect((await client.createFixedRateTransactionV1({
      from: "btc",
      to: "eth",
      address: "0xabc",
      amount: 0.2,
      rateId: "rate-v1",
    })).id).toBe("v1-fixed");
    expect((await client.getTransactionV1("v1-1")).status).toBe("waiting");
    expect((await client.listTransactionsV1({ from: "btc", status: "finished", limit: 5 }))[0].status).toBe(
      "finished"
    );

    const currencyCall = mock.history.get.find((call) => call.url?.includes("/v1/currencies"));
    expect(currencyCall?.params?.api_key ?? currencyCall?.url).toBeTruthy();
  });

  test("transaction status alias reads the v2 exchange", async () => {
    mock.onGet("/exchange/by-id").reply(200, { id: "ex-9", status: "exchanging" });
    expect((await client.getTransaction("ex-9")).status).toBe("exchanging");
    expect((await client.getTransactionStatus("ex-9")).id).toBe("ex-9");
  });

  test("covers remaining error classes, proxy schemes, and retry headers", async () => {
    expect(() => new ChangeNow({ proxy: "https://127.0.0.1" })).not.toThrow();

    mock.onGet("/exchange/by-id").replyOnce(
      503,
      { message: "later" },
      { "retry-after": "not-a-date" }
    );
    mock.onGet("/exchange/by-id").replyOnce(408, { message: "timeout" });
    mock.onGet("/exchange/by-id").reply(200, { id: "ex-1", status: "new" });
    expect((await client.getExchange("ex-1")).status).toBe("new");

    const dated = new ChangeNow({ apiKey: "k", retries: 1, retryDelayMs: 0 });
    mock.onGet("/exchange/range").replyOnce(429, { message: "slow" }, {
      "retry-after": new Date(Date.now() - 1000).toUTCString(),
    });
    mock.onGet("/exchange/range").reply(200, { minAmount: 1, maxAmount: 2 });
    expect((await dated.getRange({ fromCurrency: "btc", toCurrency: "eth" })).minAmount).toBe(1);

    const codes: Array<[number, string, string]> = [
      [400, "INVALID_ADDRESS", "ChangeNowAddressError"],
      [400, "UNKNOWN_ASSET", "ChangeNowAssetError"],
      [400, "PAIR_NOT_AVAILABLE", "ChangeNowPairError"],
      [400, "RATE_UNAVAILABLE", "ChangeNowRateError"],
      [418, "TEAPOT", "ChangeNowError"],
      [400, "MISSING_PARAMETER", "ChangeNowValidationError"],
    ];
    for (const [status, code, name] of codes) {
      mock.onGet("/markets/estimate").replyOnce(status, {
        errors: { request: { code, message: code } },
      });
      await expect(
        client.getMarketEstimate({ fromCurrency: "usd", toCurrency: "btc", fromAmount: 1 })
      ).rejects.toMatchObject({ name, code });
    }

    mock.resetHandlers();
    mock.onGet("/exchange/by-id").reply(200, '"not-an-object"');
    await expect(client.waitForExchange("ex-3", { timeoutMs: 0, intervalMs: 0 })).rejects.toThrow(
      "Expected a JSON exchange status"
    );

    const http = (client as unknown as { http: { request: (...args: unknown[]) => Promise<unknown> } }).http;
    const spy = jest.spyOn(http, "request");
    spy.mockRejectedValueOnce(new ChangeNowError("already parsed"));
    await expect(client.getExchange("ex-4")).rejects.toMatchObject({ message: "already parsed" });
    spy.mockRejectedValueOnce("boom");
    await expect(client.getExchange("ex-4")).rejects.toMatchObject({ message: "boom" });
    spy.mockRestore();

    mock.onGet("https://vip-api.changenow.io/v1/assets").reply(200, {
      returned: 1,
      total: 5,
      has_more: true,
      next_cursor: "again",
      summary: "more",
      assets: [{ asset: "btc.btc", ticker: "btc" }],
    });
    const capped = await client.listAllAssets({ limit: 1 }, { maxPages: 1 });
    expect(capped).toHaveLength(1);

    mock.onGet("/exchange/min-amount").reply(400, {
      errors: { fromAmount: { message: "" } },
    });
    await expect(client.getMinAmount({ fromCurrency: "btc", toCurrency: "eth" })).rejects.toBeInstanceOf(
      ChangeNowValidationError
    );
  });

  test("empty and array error bodies still become ChangeNowError", async () => {
    mock.onGet("/exchange/range").replyOnce(400, ["bad", "pair"]);
    await expect(client.getRange({ fromCurrency: "a", toCurrency: "b" })).rejects.toMatchObject({
      message: "bad; pair",
    });
    mock.onGet("/exchange/range").replyOnce(400, { errors: {} });
    await expect(client.getRange({ fromCurrency: "a", toCurrency: "b" })).rejects.toBeInstanceOf(
      ChangeNowValidationError
    );
    mock.onGet("/markets/estimate").reply(404, { code: "NOT_FOUND", message: "missing" });
    await expect(
      client.getMarketEstimate({ fromCurrency: "usd", toCurrency: "btc", fromAmount: 1 })
    ).rejects.toBeInstanceOf(ChangeNowNotFoundError);
  });
});
