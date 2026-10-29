import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { createHmac } from "node:crypto";

import {
  BitcoinVn,
  BitcoinVnBadRequestError,
  BitcoinVnError,
  BitcoinVnMaintenanceError,
  BitcoinVnRateLimitError,
  BitcoinVnServerError,
  BitcoinVnTimeoutError,
  BitcoinVnTransportError,
  BitcoinVnUnauthorizedError,
  ORDERS_PAGE_SIZE,
  readWebhook,
  verifyWebhookSignature,
  webhookSignature,
} from "../src/index.js";
import { errorFromBody, headerNumber, headerValue, parseRetryAfter } from "../src/errors.js";
import { normalizeProxy, readRateLimit } from "../src/client.js";

const ORDER = {
  id: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  shortId: "BV2MTZAF",
  status: "new" as const,
  depositMethod: "btc",
  depositAsset: "BTC",
  depositFee: 0.001,
  depositData: { address: "bc1qdeposit" },
  settleMethod: "xmr",
  settleAsset: "XMR",
  settleFee: 0.0001,
  settleData: { address: "4example" },
  depositMin: 0.0001,
  createdAt: "2023-04-10T10:00:00+00:00",
  expiresAt: "2023-04-17T10:00:00+00:00",
};

type Reply = [number, unknown, Record<string, string>?];

function readBody(config: AxiosRequestConfig): Record<string, unknown> {
  const data = config.data as unknown;
  if (typeof data === "string") return JSON.parse(data) as Record<string, unknown>;
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return {};
}

function clientWith(
  handler: (config: AxiosRequestConfig, attempt: number) => Reply | Promise<Reply>,
  options: Record<string, unknown> = {},
) {
  let attempt = 0;
  const http = axios.create({
    adapter: async (config) => {
      attempt += 1;
      const reply = await handler(config, attempt);
      if (reply[0] === 0) {
        const error = new axios.AxiosError(String(reply[1] ?? "network down"));
        const extra = reply[2] as { response?: AxiosResponse } | undefined;
        if (extra?.response) error.response = extra.response;
        throw error;
      }
      return {
        status: reply[0],
        data: reply[1],
        statusText: String(reply[0]),
        headers: reply[2] ?? {},
        config,
      } as AxiosResponse;
    },
  });
  const sleeps: number[] = [];
  const client = new BitcoinVn({
    axios: http,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    ...options,
  });
  return { client, sleeps, calls: () => attempt };
}

describe("configuration", () => {
  it("accepts an API key string and strips the base URL", () => {
    const owned = new BitcoinVn({
      apiKey: "  secret  ",
      baseUrl: "https://example.test/",
      timeoutMs: 1500,
      proxy: "http://user:p%40ss@127.0.0.1:8080",
    });
    const http = (owned as unknown as { http: { defaults: { baseURL?: string; timeout?: number; proxy?: unknown } } })
      .http;
    expect(http.defaults.baseURL).toBe("https://example.test");
    expect(http.defaults.timeout).toBe(1500);
    expect(http.defaults.proxy).toMatchObject({
      protocol: "http",
      host: "127.0.0.1",
      port: 8080,
      auth: { username: "user", password: "p@ss" },
    });
    expect((owned as unknown as { apiKey?: string }).apiKey).toBe("secret");
    const keyed = new BitcoinVn("secret");
    expect((keyed as unknown as { apiKey?: string }).apiKey).toBe("secret");
  });

  it("defaults an omitted proxy port and passes a proxy object through", () => {
    expect(normalizeProxy("https://proxy.example")).toMatchObject({
      protocol: "https",
      host: "proxy.example",
      port: 443,
    });
    expect(normalizeProxy("http://proxy.example")).toMatchObject({ port: 80 });
    const proxy = { host: "127.0.0.1", port: 9, protocol: "http" };
    expect(normalizeProxy(proxy)).toBe(proxy);
  });

  it("rejects a proxy that is not http or https", () => {
    expect(() => normalizeProxy("not a url")).toThrow(BitcoinVnError);
    expect(() => normalizeProxy("socks5://127.0.0.1:1080")).toThrow(/Unsupported proxy protocol/);
  });

  it("keeps caller headers without replacing the API key or user agent", async () => {
    const { client } = clientWith((config) => {
      const headers = config.headers as Record<string, string> & { get?: (name: string) => unknown };
      const read = (name: string) =>
        typeof headers.get === "function" ? headers.get(name) : headers[name];
      expect(read("X-API-KEY")).toBe("secret");
      expect(read("User-Agent")).toBe("bitcoinvn/0.1.0");
      expect(read("X-Trace")).toBe("abc");
      return [200, { status: "ok" }];
    });
    const traced = new BitcoinVn({
      apiKey: "secret",
      headers: { "X-Trace": "abc", "X-API-KEY": "nope", "User-Agent": "other" },
      axios: (client as unknown as { http: ReturnType<typeof axios.create> }).http,
    });
    await traced.getHealth();
  });
});

describe("retries and rate limits", () => {
  it("retries a GET after 429 and records the rate-limit snapshot", async () => {
    const { client, sleeps, calls } = clientWith(
      (_config, attempt) => {
        if (attempt === 1) {
          return [
            429,
            { error: { message: "maintenance", code: 429 } },
            {
              "x-ratelimit-limit": "100",
              "x-ratelimit-remaining": "0",
              "x-ratelimit-retry-after": "1.9",
            },
          ];
        }
        return [200, { status: "ok" }, { "x-ratelimit-remaining": "99", "x-ratelimit-limit": "100" }];
      },
      { retries: 2, retryDelayMs: 25, maxRetryDelayMs: 40 },
    );
    await expect(client.getHealth()).resolves.toEqual({ status: "ok" });
    expect(calls()).toBe(2);
    expect(sleeps).toEqual([40]);
    expect(client.lastRateLimit).toEqual({ limit: 100, remaining: 99 });
  });

  it("does not retry POST unless retryMutations is set", async () => {
    const once = clientWith(() => [503, { error: { message: "down", code: 503 } }], {
      retries: 3,
    });
    await expect(once.client.createQuote({ depositMethod: "btc", settleMethod: "xmr" })).rejects.toBeInstanceOf(
      BitcoinVnMaintenanceError,
    );
    expect(once.calls()).toBe(1);

    const mutated = clientWith(
      (_config, attempt) => {
        if (attempt < 2) return [500, "bad gateway"];
        return [201, { depositMethod: "btc", settleMethod: "xmr", id: "q" }];
      },
      { retries: 2, retryMutations: true, retryDelayMs: 0, maxRetryDelayMs: 0 },
    );
    await expect(mutated.client.quote({ depositMethod: "btc", settleMethod: "xmr" })).resolves.toMatchObject({
      id: "q",
    });
    expect(mutated.calls()).toBe(2);
    expect(mutated.sleeps).toEqual([]);
  });

  it("does not retry a 400 and surfaces limit headers", async () => {
    const { client, calls } = clientWith(
      () => [400, { error: { message: "", code: "400", details: { field: "x" } } }, { "X-RateLimit-Limit": "10" }],
      { retries: 4 },
    );
    const error = await client.getTicker("NOPE", "USDT").then(
      () => {
        throw new Error("expected failure");
      },
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(BitcoinVnBadRequestError);
    expect(error).toMatchObject({ message: "HTTP 400", code: 400, limit: 10, details: { field: "x" } });
    expect(calls()).toBe(1);
    expect(client.lastRateLimit).toEqual({ limit: 10 });
  });

  it("retries transport failures on GET and maps an Axios response thrown by the adapter", async () => {
    const retried = clientWith(
      (_config, attempt) => {
        if (attempt === 1) return [0, "socket hang up"];
        return [200, { rate: 1, volume24h: 2 }];
      },
      { retries: 1, retryDelayMs: 5, maxRetryDelayMs: 5 },
    );
    await expect(retried.client.getTicker("BTC", "USDT")).resolves.toEqual({ rate: 1, volume24h: 2 });
    expect(retried.sleeps).toEqual([5]);

    const thrown = clientWith(() => {
      const response = {
        status: 502,
        data: '{"error":{"message":"bad gateway","code":502}}',
        headers: { get: (name: string) => (name === "x-ratelimit-remaining" ? "3" : undefined) },
        statusText: "bad",
        config: {},
      } as unknown as AxiosResponse;
      return [0, "boom", { response } as unknown as Record<string, string>];
    });
    await expect(thrown.client.getInfo()).rejects.toBeInstanceOf(BitcoinVnServerError);
  });

  it("uses a non-Error throw as the transport message", async () => {
    const http = axios.create({
      adapter: async () => {
        throw "nope";
      },
    });
    const client = new BitcoinVn({ axios: http });
    await expect(client.getHealth()).rejects.toMatchObject({
      name: "BitcoinVnTransportError",
      message: "Request failed",
      status: 0,
    });
  });
});

describe("orders, aliases, and pagination", () => {
  it("sends fixed and variable swaps with the pinned referrer", async () => {
    const bodies: Record<string, unknown>[] = [];
    const { client } = clientWith((config) => {
      bodies.push(readBody(config));
      return [201, ORDER];
    });
    await client.fixedSwap("quote-1", "bc1qexample", {
      webhookUrl: "https://merchant.example/hook",
      customOrderId: "rent",
    });
    await client.fixedSwap("quote-2", { invoice: "lnbc1" });
    await client.fixedSwap("quote-3", "");
    await client.variableSwap("btc", "vnd", {
      accountNumber: "0123456789",
      bank: "Vietcombank",
    });
    await client.variableSwap("btc", "xmr", null);
    expect(bodies[0]).toEqual({
      quote: "quote-1",
      settleData: { address: "bc1qexample" },
      webhookUrl: "https://merchant.example/hook",
      customOrderId: "rent",
      referrer: "35b2eec68a1741ac",
    });
    expect(bodies[1]).toMatchObject({ settleData: { invoice: "lnbc1" }, referrer: "35b2eec68a1741ac" });
    expect(bodies[2]).toEqual({ quote: "quote-3", referrer: "35b2eec68a1741ac" });
    expect(bodies[3]).toMatchObject({
      depositMethod: "btc",
      settleMethod: "vnd",
      settleData: { accountNumber: "0123456789", bank: "Vietcombank" },
    });
    expect(bodies[4]).toEqual({
      depositMethod: "btc",
      settleMethod: "xmr",
      referrer: "35b2eec68a1741ac",
    });
  });

  it("aliases info, pair, order, orders, and balances", async () => {
    const { client } = clientWith((config) => {
      if (config.url === "/api/info") return [200, { assets: {}, transferMethods: {} }];
      if (config.url === "/api/pairs/a%2Fb/xmr") return [200, { rate: 1, min: 2 }];
      if (config.url === "/api/orders") return [200, [ORDER]];
      if (config.url === "/api/orders/BV2MTZAF") return [200, ORDER];
      if (config.url === "/api/balances") return [200, { BTC: 1 }];
      return [404, { error: { message: config.url, code: 404 } }];
    });
    await expect(client.info()).resolves.toEqual({ assets: {}, transferMethods: {} });
    await expect(client.pair("a/b", "xmr")).resolves.toEqual({ rate: 1, min: 2 });
    await expect(client.order("BV2MTZAF")).resolves.toMatchObject({ shortId: "BV2MTZAF" });
    await expect(client.orders()).resolves.toHaveLength(1);
    await expect(client.balances()).resolves.toEqual({ BTC: 1 });
  });

  it("pages orders and ledger rows until a short page and honors maxPages", async () => {
    const fullOrders = Array.from({ length: ORDERS_PAGE_SIZE }, (_, index) => ({
      ...ORDER,
      shortId: `BV${index}`,
    }));
    const { client } = clientWith((config) => {
      const page = Number((config.params as { page?: number }).page);
      if (String(config.url).includes("history")) {
        if (page === 1) {
          return [200, Array.from({ length: 25 }, (_, index) => ({ id: String(index), asset: "BTC", value: 1, createdAt: "t" }))];
        }
        return [200, [{ id: "last", asset: "BTC", value: -1, createdAt: "t" }]];
      }
      if (page < 2) return [200, fullOrders];
      return [200, [ORDER]];
    });
    const orders = await client.listAllOrders({ customOrderId: "rent" });
    expect(orders).toHaveLength(11);
    const rows = await client.listAllBalanceHistory({ assetId: "BTC" });
    expect(rows).toHaveLength(26);

    const capped = await client.listAllOrders({ maxPages: 1 });
    expect(capped).toHaveLength(ORDERS_PAGE_SIZE);
    await expect(client.listAllOrders({ maxPages: 0 })).resolves.toEqual([]);
  });

  it("waits until a requested status and times out with the last order", async () => {
    let now = 1_000;
    const { client } = clientWith(
      () => {
        now += 10;
        return [200, { ...ORDER, status: now < 1_030 ? "pending" : "completed" }];
      },
      {
        now: () => now,
        sleep: async () => {
          now += 100;
        },
      },
    );
    await expect(
      client.waitForOrder("BV2MTZAF", { timeoutMs: 5_000, intervalMs: 100, statuses: ["completed"] }),
    ).resolves.toMatchObject({ status: "completed" });
  });

  it("times out, stops on the default actionable status, and honors abort", async () => {
    let now = 0;
    const timeoutClient = new BitcoinVn({
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      axios: axios.create({
        adapter: async (config) =>
          ({
            status: 200,
            data: { ...ORDER, status: "processing" },
            statusText: "200",
            headers: {},
            config,
          }) as AxiosResponse,
      }),
    });
    const error = await timeoutClient
      .waitForOrder("BV2MTZAF", { timeoutMs: 1_000, intervalMs: 400 })
      .then(
        () => {
          throw new Error("expected timeout");
        },
        (caught: unknown) => caught,
      );
    expect(error).toBeInstanceOf(BitcoinVnTimeoutError);
    expect(error).toMatchObject({ order: { status: "processing" } });

    const ready = new BitcoinVn({
      axios: axios.create({
        adapter: async (config) =>
          ({
            status: 200,
            data: { ...ORDER, status: "settle_data_error" },
            statusText: "200",
            headers: {},
            config,
          }) as AxiosResponse,
      }),
    });
    await expect(ready.waitForOrder("BV2MTZAF", { timeoutMs: 50, intervalMs: 10 })).resolves.toMatchObject({
      status: "settle_data_error",
    });

    const controller = new AbortController();
    controller.abort();
    const aborted = new BitcoinVn({
      axios: axios.create({
        adapter: async () => {
          throw new Error("should not request");
        },
      }),
    });
    await expect(aborted.waitForOrder("BV2MTZAF", { signal: controller.signal })).rejects.toMatchObject({
      message: "The wait was aborted",
    });

    const during = new AbortController();
    const sleeping = new BitcoinVn({
      now: () => 0,
      sleep: async () => {
        during.abort();
      },
      axios: axios.create({
        adapter: async (config) =>
          ({
            status: 200,
            data: ORDER,
            statusText: "200",
            headers: {},
            config,
          }) as AxiosResponse,
      }),
    });
    await expect(
      sleeping.waitForOrder("BV2MTZAF", { signal: during.signal, timeoutMs: 10_000, intervalMs: 25 }),
    ).rejects.toMatchObject({ message: "The wait was aborted" });

    const already = new AbortController();
    const preaborted = new BitcoinVn({
      axios: axios.create({
        adapter: async (config) => {
          already.abort();
          return {
            status: 200,
            data: ORDER,
            statusText: "200",
            headers: {},
            config,
          } as AxiosResponse;
        },
      }),
    });
    await expect(
      preaborted.waitForOrder("BV2MTZAF", { signal: already.signal, timeoutMs: 10_000, intervalMs: 50 }),
    ).rejects.toMatchObject({ message: "The wait was aborted" });

    let polls = 0;
    const polled = new BitcoinVn({
      axios: axios.create({
        adapter: async (config) => {
          polls += 1;
          return {
            status: 200,
            data: { ...ORDER, status: polls === 1 ? "pending" : "completed" },
            statusText: "200",
            headers: {},
            config,
          } as AxiosResponse;
        },
      }),
    });
    const quiet = new AbortController();
    await expect(
      polled.waitForOrder("BV2MTZAF", {
        signal: quiet.signal,
        timeoutMs: 5_000,
        intervalMs: 15,
        statuses: ["completed"],
      }),
    ).resolves.toMatchObject({ status: "completed" });

    const live = new AbortController();
    const timed = new BitcoinVn({
      axios: axios.create({
        adapter: async (config) =>
          ({
            status: 200,
            data: ORDER,
            statusText: "200",
            headers: {},
            config,
          }) as AxiosResponse,
      }),
    });
    const pending = timed.waitForOrder("BV2MTZAF", {
      signal: live.signal,
      timeoutMs: 30_000,
      intervalMs: 5_000,
    });
    setTimeout(() => live.abort(), 15);
    await expect(pending).rejects.toMatchObject({ message: "The wait was aborted" });
  });
});

describe("webhooks and helpers", () => {
  it("signs and verifies the raw body", () => {
    const body = JSON.stringify({ ...ORDER, status: "completed" });
    const signature = webhookSignature(body, "secret");
    expect(signature).toBe(createHmac("sha256", "secret").update(body).digest("hex"));
    expect(verifyWebhookSignature(body, signature.toUpperCase(), "secret")).toBe(true);
    expect(verifyWebhookSignature(Buffer.from(body), `  ${signature}  `, "secret")).toBe(true);
    expect(verifyWebhookSignature(body, signature.slice(0, 10), "secret")).toBe(false);
    expect(verifyWebhookSignature(body, "a".repeat(signature.length), "secret")).toBe(false);
    expect(verifyWebhookSignature(body, "", "secret")).toBe(false);
    expect(verifyWebhookSignature(body, signature, "")).toBe(false);

    const client = new BitcoinVn("secret");
    expect(client.verifyWebhook(body, signature)).toBe(true);
    expect(new BitcoinVn().verifyWebhook(body, signature)).toBe(false);
    expect(client.readWebhook(body, signature).verified).toBe(true);
    expect(client.readWebhook(body).verified).toBe(false);
    expect(() => client.readWebhook(body, "00", { requireSignature: true })).toThrow(
      BitcoinVnUnauthorizedError,
    );
    expect(readWebhook(body).order.shortId).toBe("BV2MTZAF");
    expect(() => readWebhook("[]", undefined, "secret", { requireSignature: true })).toThrow(
      BitcoinVnUnauthorizedError,
    );
    expect(() => readWebhook("not-json")).toThrow(/not JSON/);
    expect(() => readWebhook("[]")).toThrow(/not an order object/);
    expect(readWebhook(Buffer.from(body), signature, "secret").verified).toBe(true);
    expect(() => readWebhook("null")).toThrow(/not an order object/);
    expect(() => readWebhook('"text"')).toThrow(/not an order object/);
    const originalParse = JSON.parse;
    JSON.parse = () => {
      throw "bad";
    };
    try {
      expect(() => readWebhook("{}")).toThrow(/not JSON/);
    } finally {
      JSON.parse = originalParse;
    }
    expect(new BitcoinVnTimeoutError("late").order).toBeUndefined();
    expect(client.swapUrl("btc", "xmr")).toBe("https://bitcoinvn.io/?deposit=btc&settle=xmr");
    expect(client.swapUrl()).toBe("https://bitcoinvn.io/");
    expect(new BitcoinVn({ baseUrl: "https://staging.example/api/" }).swapUrl("eth")).toBe(
      "https://staging.example/?deposit=eth",
    );
  });

  it("parses error envelopes and header shapes", () => {
    expect(headerValue(null, "x")).toBeUndefined();
    expect(headerValue({ get: () => " 12 " }, "x-ratelimit-retry-after")).toBe("12");
    expect(headerValue({ get: () => 7 }, "x-ratelimit-limit")).toBe("7");
    expect(headerValue({ get: () => "  " }, "x")).toBeUndefined();
    expect(headerValue({ "X-RateLimit-Remaining": [" 4 ", ""] }, "x-ratelimit-remaining")).toBe("4");
    expect(headerValue({ "X-RateLimit-Remaining": [8] }, "x-ratelimit-remaining")).toBe("8");
    expect(headerValue({ other: "no" }, "x-ratelimit-limit")).toBeUndefined();
    expect(headerValue({ get: () => ["", 3] }, "x-ratelimit-limit")).toBe("3");
    expect(parseRetryAfter({ "x-ratelimit-retry-after": "nope" })).toBeUndefined();
    expect(parseRetryAfter({ "x-ratelimit-retry-after": "12.9" })).toBe(12);
    expect(headerNumber({ "x-ratelimit-limit": "" }, "x-ratelimit-limit")).toBeUndefined();
    expect(readRateLimit({})).toBeUndefined();
    expect(readRateLimit({ "x-ratelimit-retry-after": "2" })).toEqual({ retryAfter: 2 });

    const parsed = errorFromBody(429, { error: { message: "slow", code: 429 } }, 4);
    expect(parsed).toBeInstanceOf(BitcoinVnRateLimitError);
    expect(parsed.retryAfter).toBe(4);
    expect(errorFromBody(418, { error: { code: 418 } }).message).toBe("HTTP 418");
    expect(errorFromBody(418, { error: { code: 418 } }).name).toBe("BitcoinVnError");
    expect(errorFromBody(404, "missing").message).toBe("missing");
    expect(errorFromBody(500, "").message).toBe("HTTP 500");
    expect(errorFromBody(500, "  ").name).toBe("BitcoinVnServerError");
    expect(errorFromBody(409, { nope: true }).code).toBe(409);
    expect(errorFromBody(0, null).name).toBe("BitcoinVnTransportError");
    const fromString = errorFromBody(422, '{"error":{"message":"bad name","code":422,"details":{"name":"x"}}}');
    expect(fromString.details).toEqual({ name: "x" });
    expect(fromString.message).toBe("bad name");
    expect(errorFromBody(400, "[1,2]").message).toBe("[1,2]");
    expect(errorFromBody(400, " { ").message).toBe("{");
  });
});

describe("BitcoinVnTransportError", () => {
  it("is a BitcoinVnError", () => {
    const error = new BitcoinVnTransportError("down", { status: 0, code: 0 });
    expect(error).toBeInstanceOf(BitcoinVnError);
    expect(error).toBeInstanceOf(BitcoinVnTransportError);
  });
});
