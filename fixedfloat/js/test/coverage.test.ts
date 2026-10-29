import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  assertQuoteOk,
  filterRates,
  FixedFloat,
  FixedFloatApiError,
  FixedFloatAuthError,
  FixedFloatError,
  FixedFloatHttpError,
  FixedFloatNetworkError,
  FixedFloatRateLimitError,
  FixedFloatTimeoutError,
  isFixedFloatError,
  ORDER_STATUS_TEXT,
  orderStatusText,
  parsePriceShorthand,
  parseRatesXml,
  PRICE_ERROR_TEXT,
  proxyConfigFromUrl,
  TERMINAL_ORDER_STATUSES,
} from "../src/index.js";

const XML = `<?xml version="1.0"?>
<rates>
  <item>
    <from>BTC</from>
    <to>ETH</to>
    <in>1</in>
    <out>17.72</out>
    <amount>191.1</amount>
    <tofee>0.0004 ETH</tofee>
    <minamount>0.001 BTC</minamount>
    <maxamount>2 BTC</maxamount>
  </item>
  <item>
    <from>btc</from>
    <to>USDT</to>
    <in>1</in>
    <out>60000</out>
    <amount>10</amount>
    <tofee>1 &amp; 2 USDT</tofee>
    <minamount>0.002 BTC</minamount>
    <maxamount>3 BTC</maxamount>
  </item>
</rates>`;

const ORDER = {
  id: "ORD123",
  type: "float",
  email: "",
  status: "NEW",
  time: { reg: 10, start: null, finish: null, update: 10, expiration: 20, left: 10 },
  from: {
    code: "BTC",
    coin: "BTC",
    network: "BTC",
    name: "Bitcoin",
    alias: "btc",
    amount: "0.1",
    address: "bc1q",
    tag: null,
    addressMix: "bc1q",
    reqConfirmations: 1,
    maxConfirmations: 2,
    tx: { id: null, amount: null, fee: null, ccyfee: null, timeReg: null, timeBlock: null, confirmations: 0 },
  },
  to: { code: "ETH", coin: "ETH", network: "ETH", amount: "1", address: "0xabc", tag: "memo" },
  back: { code: "BTC", coin: "BTC", network: "BTC", amount: "0.1", address: "bc1qrefund", tag: "r" },
  emergency: { status: ["LESS", "LIMIT"], choice: "NONE", repeat: false },
  token: "TOK",
};

function client(options: ConstructorParameters<typeof FixedFloat>[0] = {}) {
  return new FixedFloat({ apiKey: "key", apiSecret: "secret", retries: 0, retryDelay: 0, ...options });
}

describe("rates helpers", () => {
  test("parses, filters and rejects rates XML", () => {
    const items = parseRatesXml(XML);
    expect(items).toHaveLength(2);
    expect(items[1].toFee).toBe("1 & 2 USDT");
    expect(filterRates(items, "BTC", "eth")).toEqual([items[0]]);
    expect(filterRates(items, undefined, "USDT")).toHaveLength(1);
    expect(parseRatesXml("<rates></rates>")).toEqual([]);
    expect(() => parseRatesXml("<nope></nope>")).toThrow(FixedFloatError);
    expect(parseRatesXml("<rates><item></item></rates>")[0]).toMatchObject({ from: "", to: "" });
  });

  test("price shorthand and quote assertions", () => {
    expect(parsePriceShorthand("0.1 eth", "btc")).toMatchObject({
      fromCcy: "ETH",
      toCcy: "BTC",
      amount: 0.1,
      direction: "from",
      type: "float",
    });
    expect(parsePriceShorthand("ETH", "0.2 BTC", "fixed").direction).toBe("to");
    expect(() => parsePriceShorthand("ETH", "BTC")).toThrow(/shorthand/);
    expect(() => parsePriceShorthand("0.1 ETH", "0.2 BTC")).toThrow(FixedFloatError);

    const ok = { from: {}, to: {} } as never;
    expect(() => assertQuoteOk(ok)).not.toThrow();
    expect(() => assertQuoteOk({ from: {}, to: {}, errors: [] } as never)).not.toThrow();
    expect(() => assertQuoteOk({ from: {}, to: {}, errors: ["LIMIT_MIN", "CUSTOM"] } as never)).toThrow(
      /minimum/,
    );
    expect(PRICE_ERROR_TEXT.OFFLINE_FROM).toMatch(/offline/i);
    expect(orderStatusText("DONE")).toBe(ORDER_STATUS_TEXT.DONE);
    expect(orderStatusText("WHATEVER")).toBe("WHATEVER");
    expect(TERMINAL_ORDER_STATUSES).toContain("EMERGENCY");
  });

  test("proxy URLs", () => {
    expect(proxyConfigFromUrl("http://user:p%40ss@127.0.0.1:8080")).toEqual({
      protocol: "http",
      host: "127.0.0.1",
      port: 8080,
      auth: { username: "user", password: "p@ss" },
    });
    expect(proxyConfigFromUrl("https://proxy.example").port).toBe(443);
    expect(proxyConfigFromUrl("http://proxy.example").port).toBe(80);
    expect(() => proxyConfigFromUrl("not a url")).toThrow(/Invalid proxy URL/);
    expect(() => proxyConfigFromUrl("http://")).toThrow(/Invalid proxy URL/);
  });
});

describe("FixedFloat extended API", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  test("price flags, shorthand, aliases and quote errors", async () => {
    const ff = client();
    let body: Record<string, unknown> = {};
    mock.onPost("https://ff.io/api/v2/price").reply((config) => {
      body = JSON.parse(config.data);
      return [200, { code: 0, msg: "", data: { from: { amount: "1" }, to: { amount: "2" }, errors: [], ccies: [] } }];
    });

    const quote = await ff.getPrice({
      fromCcy: "BTC",
      toCcy: "ETH",
      amount: 1,
      direction: "from",
      type: "fixed",
      ccies: true,
      usd: true,
    });
    expect(quote.to.amount).toBe("2");
    expect(body.ccies).toBe(true);
    expect(body.usd).toBe(true);
    expect(body.refcode).toBe("gfc1h2fb");

    await ff.price({ fromCcy: "BTC", toCcy: "ETH", amount: 1, direction: "to", type: "float" });
    expect(body.direction).toBe("to");

    await ff.getPrice("0.5 ETH", "BTC", "fixed");
    expect(body).toMatchObject({ fromCcy: "ETH", toCcy: "BTC", amount: 0.5, direction: "from", type: "fixed" });
    await ff.price("ETH", "0.01 BTC");
    expect(body.direction).toBe("to");

    mock.reset();
    mock.onPost("https://ff.io/api/v2/price").reply(200, {
      code: 0,
      msg: "",
      data: { from: {}, to: {}, errors: ["RESERVE_TO"] },
    });
    await expect(
      ff.getPriceOrThrow({ fromCcy: "BTC", toCcy: "ETH", amount: 1, direction: "from", type: "float" }),
    ).rejects.toThrow(/reserves/i);
  });

  test("create sends tag, legacy extra id and refund fields, and is not retried", async () => {
    const ff = client({ retries: 3 });
    let body: Record<string, unknown> = {};
    mock.onPost("https://ff.io/api/v2/create").replyOnce((config) => {
      body = JSON.parse(config.data);
      return [500, { code: 500, msg: "down" }];
    });
    mock.onPost("https://ff.io/api/v2/create").reply(200, { code: 0, msg: "", data: ORDER });

    await expect(
      ff.createOrder({
        fromCcy: "BTC",
        toCcy: "XRP",
        amount: 1,
        direction: "from",
        type: "float",
        toAddress: "rAddress",
        tag: "memo",
        extraId: "legacy",
        refundAddress: "bc1qrefund",
        refundExtraId: "rtag",
        afftax: 0.1,
      }),
    ).rejects.toBeInstanceOf(FixedFloatApiError);
    expect(mock.history.post).toHaveLength(1);
    expect(body.tag).toBe("memo");
    expect(body.extraId).toBe("legacy");
    expect(body.refundAddress).toBe("bc1qrefund");
    expect(body.refcode).toBe("gfc1h2fb");

    mock.reset();
    mock.onPost("https://ff.io/api/v2/create").reply((config) => {
      body = JSON.parse(config.data);
      return [200, { code: 0, msg: "", data: ORDER }];
    });
    const created = await ff.create({
      fromCcy: "BTC",
      toCcy: "XRP",
      amount: 1,
      direction: "from",
      type: "float",
      toAddress: "rAddress",
      extraId: "only-extra",
    });
    expect(created.id).toBe("ORD123");
    expect(body.tag).toBe("only-extra");
    expect(body.extraId).toBe("only-extra");
  });

  test("order polling, status text and emergency tag", async () => {
    const ff = client();
    mock
      .onPost("https://ff.io/api/v2/order")
      .replyOnce(200, { code: 0, msg: "", data: { ...ORDER, status: "PENDING" } })
      .onPost("https://ff.io/api/v2/order")
      .reply(200, { code: 0, msg: "", data: { ...ORDER, status: "DONE" } });

    const done = await ff.waitForOrder("ORD123", "TOK", { timeoutMs: 1000, intervalMs: 0 });
    expect(done.status).toBe("DONE");
    expect(ff.statusText(done.status)).toMatch(/completed/i);
    expect(await ff.order("ORD123", "TOK")).toMatchObject({ id: "ORD123" });

    mock.reset();
    mock.onPost("https://ff.io/api/v2/order").reply(200, { code: 0, msg: "", data: { ...ORDER, status: "NEW" } });
    await expect(ff.waitForOrder("ORD123", "TOK", { timeoutMs: 0, intervalMs: 0 })).rejects.toBeInstanceOf(
      FixedFloatTimeoutError,
    );

    const controller = new AbortController();
    controller.abort();
    await expect(
      ff.waitForOrder("ORD123", "TOK", { signal: controller.signal, timeoutMs: 1000 }),
    ).rejects.toThrow(/aborted/);

    let emergency: Record<string, unknown> = {};
    mock.onPost("https://ff.io/api/v2/emergency").reply((config) => {
      emergency = JSON.parse(config.data);
      return [200, { code: 0, msg: "", data: true }];
    });
    expect(
      await ff.emergency({ id: "ORD123", token: "TOK", choice: "REFUND", address: "bc1q", extraId: "memo" }),
    ).toBe(true);
    expect(emergency.tag).toBe("memo");
    expect(emergency.extraId).toBe("memo");
    await ff.setEmergency({ id: "ORD123", token: "TOK", choice: "EXCHANGE", tag: "official" });
    expect(emergency.tag).toBe("official");
  });

  test("aborts while waiting between polls", async () => {
    const ff = client();
    mock.onPost("https://ff.io/api/v2/order").reply(200, { code: 0, msg: "", data: ORDER });
    const controller = new AbortController();
    const pending = ff.waitForOrder("ORD123", "TOK", {
      timeoutMs: 5000,
      intervalMs: 200,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 20);
    await expect(pending).rejects.toThrow(/aborted/);
  });

  test("email aliases, qr list and raw request", async () => {
    const ff = client();
    let email = "";
    mock.onPost("https://ff.io/api/v2/setEmail").reply((config) => {
      email = JSON.parse(config.data).email;
      return [200, { code: 0, msg: "", data: true }];
    });
    expect(await ff.setEmailNotification("ORD123", "TOK", "a@b.c")).toBe(true);
    expect(await ff.subscribe("ORD123", "TOK", "c@d.e")).toBe(true);
    expect(email).toBe("c@d.e");

    mock.onPost("https://ff.io/api/v2/qr").reply(200, {
      code: 0,
      msg: "",
      data: [
        { title: "Address", src: "data:image/png;base64,AAA", checked: false },
        { title: "With amount", src: "data:image/png;base64,BBB", checked: true },
      ],
    });
    const qr = await ff.qr("ORD123", "TOK");
    expect(qr.src).toContain("BBB");
    expect(qr.codes).toHaveLength(2);
    const codes = await ff.getQRCodes("ORD123", "TOK");
    expect(codes[1].checked).toBe(true);

    mock.onPost("https://ff.io/api/v2/qr").reply(200, { code: 0, msg: "", data: "nope" });
    expect((await ff.getQr("ORD123", "TOK")).src).toBe("");

    mock.onPost("https://ff.io/api/v2/future").reply(200, { code: 0, msg: "", data: { ok: 1 } });
    expect(await ff.rawRequest("future", { a: 1 })).toEqual({ ok: 1 });
    mock.onPost("https://ff.io/api/v2/plain").reply(200, { plain: true });
    expect(await ff.rawRequest("/plain")).toEqual({ plain: true });
  });

  test("XML rates export and currency alias", async () => {
    const ff = client({ ratesBaseUrl: "https://rates.example/" });
    mock.onGet("https://rates.example/rates/float.xml").reply(200, XML);
    mock.onGet("https://rates.example/rates/fixed.xml").reply(200, "<rates></rates>");
    const rows = await ff.getRates({ from: "BTC", to: "ETH" });
    expect(rows).toHaveLength(1);
    expect(rows[0].out).toBe("17.72");
    expect(await ff.getRatesXml("fixed")).toContain("<rates>");
    await expect(ff.getRatesXml("nope" as "float")).rejects.toThrow(/Unknown rates type/);

    mock.onGet("https://rates.example/rates/float.xml").reply(200, { not: "xml" });
    await expect(ff.getRates()).rejects.toThrow(/not XML/);

    mock.onPost("https://ff.io/api/v2/ccies").reply(200, {
      code: 0,
      msg: "",
      data: [{ code: "BTC", coin: "BTC", network: "BTC", name: "Bitcoin", recv: true, send: false, tag: null, logo: "", color: "", priority: "5", contract: null }],
    });
    const currencies = await ff.ccies();
    expect(currencies[0].code).toBe("BTC");
  });

  test("retries transient failures and classifies errors", async () => {
    const ff = client({ retries: 2, headers: { "X-Debug": "1" } });
    mock.onPost("https://ff.io/api/v2/ccies").replyOnce((config) => {
      expect(config.headers?.["X-Debug"] ?? config.headers?.["x-debug"]).toBeTruthy();
      return [503, "upstream"];
    });
    mock.onPost("https://ff.io/api/v2/ccies").reply(200, { code: 0, msg: "", data: [] });
    expect(await ff.getCurrencies()).toEqual([]);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").networkError();
    await expect(ff.ccies()).rejects.toBeInstanceOf(FixedFloatNetworkError);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").timeout();
    await expect(ff.getCurrencies()).rejects.toBeInstanceOf(FixedFloatTimeoutError);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/price").reply(429, { code: 429, msg: "weight", data: { wait: 1 } });
    await expect(
      client({ retries: 0 }).getPrice({ fromCcy: "A", toCcy: "B", amount: 1, direction: "from", type: "float" }),
    ).rejects.toBeInstanceOf(FixedFloatRateLimitError);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").reply(401, { code: 401, msg: "bad key" });
    const auth = ff.getCurrencies();
    await expect(auth).rejects.toBeInstanceOf(FixedFloatAuthError);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").reply(403, "forbidden");
    await expect(client({ retries: 0 }).getCurrencies()).rejects.toBeInstanceOf(FixedFloatAuthError);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").reply(429, "slow down");
    await expect(client({ retries: 0 }).getCurrencies()).rejects.toBeInstanceOf(FixedFloatRateLimitError);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").reply(418, "teapot");
    await expect(client({ retries: 0 }).getCurrencies()).rejects.toBeInstanceOf(FixedFloatHttpError);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").reply(200, { code: 7, msg: "", data: { field: "x" } });
    try {
      await client({ retries: 0 }).getCurrencies();
      throw new Error("expected api error");
    } catch (error) {
      expect(isFixedFloatError(error)).toBe(true);
      expect(error).toBeInstanceOf(FixedFloatApiError);
      expect((error as FixedFloatApiError).code).toBe(7);
      expect((error as FixedFloatApiError).data).toEqual({ field: "x" });
    }

    mock.reset();
    mock.onGet("https://ff.io/rates/float.xml").replyOnce(502, "bad");
    mock.onGet("https://ff.io/rates/float.xml").reply(200, "<rates></rates>");
    expect(await client({ retries: 1 }).getRates()).toEqual([]);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/create").networkError();
    await expect(
      client({ retries: 2 }).rawRequest("/create", { a: 1 }),
    ).rejects.toBeInstanceOf(FixedFloatNetworkError);
    expect(mock.history.post).toHaveLength(1);

    mock.reset();
    mock.onPost("https://ff.io/api/v2/ccies").networkErrorOnce();
    mock.onPost("https://ff.io/api/v2/ccies").reply(200, { code: 0, msg: "", data: [] });
    expect(await client({ retries: 1, retryDelay: 1 }).getCurrencies()).toEqual([]);
  });

  test("default retries recover from HTTP 500", async () => {
    mock.onPost("https://ff.io/api/v2/ccies").replyOnce(500, { code: 500, msg: "boom" });
    mock.onPost("https://ff.io/api/v2/ccies").reply(200, { code: 0, msg: "", data: [] });
    const ff = new FixedFloat({ apiKey: "k", apiSecret: "s", retryDelay: 0 });
    expect(await ff.getCurrencies()).toEqual([]);
    expect(mock.history.post.length).toBeGreaterThan(1);
  });

  test("applies a proxy and omits auth headers when keys are absent", async () => {
    const ff = new FixedFloat({ proxy: "http://127.0.0.1:8888", retries: 0, timeout: 1000 });
    const proxy = ff["http"].defaults.proxy as { host?: string; port?: number };
    expect(proxy.host).toBe("127.0.0.1");
    expect(proxy.port).toBe(8888);

    let headers: Record<string, string> = {};
    mock.onPost("https://ff.io/api/v2/ccies").reply((config) => {
      headers = config.headers as Record<string, string>;
      return [200, { code: 0, msg: "", data: [] }];
    });
    await ff.getCurrencies();
    expect(headers["X-API-KEY"]).toBeUndefined();
    expect(headers["X-API-SIGN"]).toBeUndefined();
  });

  test("wraps non-axios failures", async () => {
    const ff = client();
    mock.onPost("https://ff.io/api/v2/ccies").reply(() => {
      throw "boom";
    });
    await expect(ff.getCurrencies()).rejects.toThrow(/boom|boom/);
  });
});
