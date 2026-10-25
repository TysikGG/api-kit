import axios, { type AxiosRequestConfig } from "axios";
import MockAdapter from "axios-mock-adapter";

import { BitcoinVn, BitcoinVnError, type CreateOrderParams } from "../src/index.js";

type Reply = [number, unknown, Record<string, string>?];

const ORDER = {
  id: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  shortId: "BV2MTZAF",
  status: "new",
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

const QUOTE = {
  id: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
  depositMethod: "btc",
  settleMethod: "xmr",
  depositAmount: 0.01,
  settleAmount: 1.5,
  rate: 150,
};

function createClient(reply: (config: AxiosRequestConfig) => Reply, apiKey?: string) {
  const http = axios.create();
  const mock = new MockAdapter(http);
  mock.onAny().reply((config) => reply(config));
  return new BitcoinVn({ apiKey, axios: http });
}

function bodyOf(config: AxiosRequestConfig): Record<string, unknown> {
  const data = config.data as unknown;
  if (typeof data === "string") return JSON.parse(data) as Record<string, unknown>;
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return {};
}

function headerOf(config: AxiosRequestConfig, name: string): string | undefined {
  const headers = config.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    const value = headers.get(name);
    if (typeof value === "string") return value;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target && typeof value === "string") return value;
  }
  return undefined;
}

function apiError(status: number, message: string, details?: unknown): Reply {
  const error: { message: string; code: number; details?: unknown } = { message, code: status };
  if (details !== undefined) error.details = details;
  return [status, { error }];
}

describe("BitcoinVn", () => {
  it("treats a blank API key as anonymous", async () => {
    const client = createClient((config) => {
      expect(headerOf(config, "X-API-KEY")).toBeUndefined();
      expect(headerOf(config, "User-Agent")).toBe("bitcoinvn/0.1.0");
      return [200, { rate: 1, volume24h: 2 }];
    }, "  ");
    await expect(client.getTicker("BTC", "USDT")).resolves.toEqual({ rate: 1, volume24h: 2 });
  });

  it("getHealth returns ok and surfaces a rate-limit error", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/health");
      expect(config.method).toBe("get");
      return [200, { status: "ok" }];
    });
    await expect(ok.getHealth()).resolves.toEqual({ status: "ok" });

    const failing = createClient(
      () => [429, { error: { message: "Too many requests.", code: 429 } }, { "X-RateLimit-Retry-After": "12" }],
    );
    await expect(failing.getHealth()).rejects.toMatchObject({
      name: "BitcoinVnError",
      message: "Too many requests.",
      status: 429,
      code: 429,
      retryAfter: 12,
    });
  });

  it("getInfo returns catalogs and rejects maintenance", async () => {
    const info = {
      assets: { BTC: { id: "BTC", name: "Bitcoin", exchangeFee: 0.02, bridgeFee: 0.0015, tags: ["crypto"] } },
      transferMethods: {
        btc: {
          enabled: true,
          id: "btc",
          asset: "BTC",
          decimals: 8,
          depositEnabled: true,
          settleEnabled: true,
          internalBalance: false,
          tags: ["crypto"],
        },
      },
    };
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/info");
      return [200, info];
    });
    await expect(ok.getInfo()).resolves.toEqual(info);

    const failing = createClient(() =>
      apiError(503, "Service temporarily unavailable for maintenance."),
    );
    await expect(failing.getInfo()).rejects.toMatchObject({ code: 503, status: 503 });
  });

  it("getPair reads the path and rejects an unknown method", async () => {
    const pair = { rate: 150, min: 0.0001, max: 1 };
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/pairs/btc/xmr");
      expect(headerOf(config, "X-API-KEY")).toBe("secret");
      return [200, pair];
    }, "secret");
    await expect(ok.getPair("btc", "xmr")).resolves.toEqual(pair);

    const failing = createClient(() => apiError(404, "Pair does not exist."));
    await expect(failing.getPair("nope", "xmr")).rejects.toMatchObject({ code: 404 });
  });

  it("getTicker reads a public rate and rejects a private asset", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/ticker/BTC/USDT");
      expect(config.params).toBeUndefined();
      expect(headerOf(config, "X-API-KEY")).toBeUndefined();
      return [200, { rate: 100, volume24h: 5 }];
    });
    await expect(ok.getTicker("BTC", "USDT")).resolves.toEqual({ rate: 100, volume24h: 5 });

    const failing = createClient(() => apiError(404, "One or both asset IDs are invalid or private"));
    await expect(failing.getTicker("NOPE", "USDT")).rejects.toMatchObject({ code: 404 });
  });

  it("validateAddress sends the query and rejects a missing value", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/addresses/validate");
      expect(config.params).toEqual({
        transferMethod: "btcln",
        address: "lnbc1example",
        invoiceAmount: 0.01,
      });
      return [200, { valid: true }];
    });
    await expect(
      ok.validateAddress({
        transferMethod: "btcln",
        address: "lnbc1example",
        invoiceAmount: 0.01,
      }),
    ).resolves.toEqual({ valid: true });

    const failing = createClient(() => apiError(400, "Unknown transfer method."));
    await expect(
      failing.validateAddress({ transferMethod: "nope", address: "x" }),
    ).rejects.toMatchObject({ code: 400 });
  });

  it("createQuote omits referrer and returns validation details", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/quotes");
      expect(config.method).toBe("post");
      const body = bodyOf(config);
      expect(body).toEqual({
        depositMethod: "btc",
        settleMethod: "xmr",
        depositAmount: 0.01,
        markupRate: 0.01,
      });
      expect(body.referrer).toBeUndefined();
      return [201, QUOTE];
    });
    await expect(
      ok.createQuote({
        depositMethod: "btc",
        settleMethod: "xmr",
        depositAmount: 0.01,
        markupRate: 0.01,
      }),
    ).resolves.toEqual(QUOTE);

    const failing = createClient(() =>
      apiError(400, "Amount is below the minimum.", { depositAmount: "too small" }),
    );
    const error = await failing
      .createQuote({ depositMethod: "btc", settleMethod: "xmr", depositAmount: 0 })
      .then(
        () => {
          throw new Error("expected an API error");
        },
        (caught: unknown) => caught,
      );
    expect(error).toBeInstanceOf(BitcoinVnError);
    expect(error).toMatchObject({
      code: 400,
      details: { depositAmount: "too small" },
    });
  });

  it("listOrders sends the key and query, and rejects a missing key", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/orders");
      expect(config.method).toBe("get");
      expect(config.params).toEqual({ page: 2, customOrderId: "rent-october" });
      expect(headerOf(config, "X-API-KEY")).toBe("secret");
      expect(bodyOf(config)).toEqual({});
      return [200, [ORDER]];
    }, "secret");
    await expect(ok.listOrders({ page: 2, customOrderId: "rent-october" })).resolves.toEqual([
      ORDER,
    ]);

    const failing = createClient(() => apiError(401, "API key is required."));
    await expect(failing.listOrders()).rejects.toMatchObject({ code: 401, status: 401 });
  });

  it("createOrder sends referrer in the JSON body and rejects a read-only key", async () => {
    const ok = createClient((config) => {
      expect(config.method).toBe("post");
      expect(config.url).toBe("/api/orders");
      expect(config.params).toBeUndefined();
      expect(headerOf(config, "referrer")).toBeUndefined();
      const body = bodyOf(config);
      expect(body.referrer).toBe("35b2eec68a1741ac");
      expect(body.quote).toBe("8120a8a8-8dd1-4168-80fc-c4d932ce5b93");
      expect(body.settleData).toEqual({ address: "4example" });
      return [201, ORDER];
    }, "secret");
    await expect(
      ok.createOrder({
        quote: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
        settleData: { address: "4example" },
      }),
    ).resolves.toEqual(ORDER);

    const replaced = createClient((config) => {
      expect(bodyOf(config).referrer).toBe("35b2eec68a1741ac");
      return [201, ORDER];
    });
    await expect(
      replaced.createOrder({
        quote: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
        referrer: "someone-else",
      } as CreateOrderParams),
    ).resolves.toEqual(ORDER);

    const failing = createClient(() => apiError(403, "Read-only API key used."));
    await expect(
      failing.createOrder({ depositMethod: "btc", settleMethod: "xmr" }),
    ).rejects.toMatchObject({ code: 403 });
  });

  it("getOrder fetches by short id and rejects an unknown order", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/orders/BV2MTZAF");
      return [200, ORDER];
    });
    await expect(ok.getOrder("BV2MTZAF")).resolves.toEqual(ORDER);

    const failing = createClient(() => apiError(404, "Order not found"));
    await expect(failing.getOrder("MISSING1")).rejects.toMatchObject({ code: 404 });
  });

  it("submitDeposit posts the txid and rejects a conflict", async () => {
    const ok = createClient((config) => {
      expect(config.method).toBe("post");
      expect(config.url).toBe("/api/orders/BV2MTZAF/deposit");
      expect(bodyOf(config)).toEqual({ txid: "abc123" });
      expect(bodyOf(config).referrer).toBeUndefined();
      return [200, { ...ORDER, status: "pending" }];
    });
    await expect(ok.submitDeposit("BV2MTZAF", { txid: "abc123" })).resolves.toMatchObject({
      status: "pending",
    });

    const failing = createClient(() => apiError(409, "Order is not new."));
    await expect(failing.submitDeposit("BV2MTZAF", { txid: "abc123" })).rejects.toMatchObject({
      code: 409,
    });
  });

  it("updateSettleData puts payout details and rejects a missing order", async () => {
    const ok = createClient((config) => {
      expect(config.method).toBe("put");
      expect(config.url).toBe("/api/orders/BV2MTZAF/settle-data");
      expect(bodyOf(config)).toEqual({ address: "bc1qnew" });
      expect(headerOf(config, "X-API-KEY")).toBe("secret");
      return [200, ORDER];
    }, "secret");
    await expect(ok.updateSettleData("BV2MTZAF", { address: "bc1qnew" })).resolves.toEqual(ORDER);

    const failing = createClient(() => apiError(404, "Order was not found."));
    await expect(failing.updateSettleData("BV2MTZAF", { invoice: "lnbc1" })).rejects.toMatchObject({
      code: 404,
    });
  });

  it("getBalances returns the map and rejects an unauthorized key", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/balances");
      expect(headerOf(config, "X-API-KEY")).toBe("secret");
      return [200, { BTC: 0.01, VND: 20000000 }];
    }, "secret");
    await expect(ok.getBalances()).resolves.toEqual({ BTC: 0.01, VND: 20000000 });

    const failing = createClient(() => apiError(401, "Invalid API key."));
    await expect(failing.getBalances()).rejects.toMatchObject({ code: 401 });
  });

  it("listBalanceHistory filters by asset and rejects an unknown asset", async () => {
    const row = {
      id: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
      asset: "BTC",
      value: 0.05,
      createdAt: "2023-04-10T10:00:00+00:00",
      note: "Order settle BV2MTZAF",
    };
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/balances/history");
      expect(config.params).toEqual({ assetId: "BTC", page: 1 });
      return [200, [row]];
    }, "secret");
    await expect(ok.listBalanceHistory({ assetId: "BTC", page: 1 })).resolves.toEqual([row]);

    const failing = createClient(() => apiError(404, "Unknown asset."));
    await expect(failing.listBalanceHistory({ assetId: "NOPE" })).rejects.toMatchObject({
      code: 404,
    });
  });

  it("listStakingOffers returns vaults and rejects maintenance", async () => {
    const vault = {
      id: "8120a8a8-8dd1-4168-80fc-c4d932ce5b93",
      asset: "sBCH",
      distribution: 0.005,
      supplyTarget: 200,
      staked: 99,
      latestApr: 0.31,
      latestFullyDilutedApr: 0.06,
    };
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/staking");
      return [200, [vault]];
    });
    await expect(ok.listStakingOffers()).resolves.toEqual([vault]);

    const failing = createClient(() => apiError(503, "Service temporarily unavailable."));
    await expect(failing.listStakingOffers()).rejects.toMatchObject({ code: 503 });
  });

  it("setAutoStake sends value and rejects a read-only key", async () => {
    const id = "8120a8a8-8dd1-4168-80fc-c4d932ce5b93";
    const ok = createClient((config) => {
      expect(config.method).toBe("put");
      expect(config.url).toBe(`/api/staking/${id}/auto-stake`);
      expect(bodyOf(config)).toEqual({ value: true });
      return [200, { value: true }];
    }, "secret");
    await expect(ok.setAutoStake(id, true)).resolves.toEqual({ value: true });

    const failing = createClient(() => apiError(403, "Read-only API key used."));
    await expect(failing.setAutoStake(id, false)).rejects.toMatchObject({ code: 403 });
  });

  it("setStakingNotifications sends value and rejects an invalid body", async () => {
    const id = "8120a8a8-8dd1-4168-80fc-c4d932ce5b93";
    const ok = createClient((config) => {
      expect(config.url).toBe(`/api/staking/${id}/notifications`);
      expect(bodyOf(config)).toEqual({ value: false });
      return [200, { value: false }];
    }, "secret");
    await expect(ok.setStakingNotifications(id, false)).resolves.toEqual({ value: false });

    const failing = createClient(() => apiError(400, "value must be a boolean."));
    await expect(failing.setStakingNotifications(id, true)).rejects.toMatchObject({ code: 400 });
  });

  it("resolveAddress reads the query and rejects an unsupported method", async () => {
    const resolved = {
      name: "alice.eth",
      address: "0xabc",
      transferMethod: "eth",
      networkId: "eth",
      networkName: "Ethereum",
      chainId: 1,
      resolvedAt: 1700000000,
      expiresAt: 1700000900,
      ensResolutionToken: "token",
    };
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/addresses/resolve");
      expect(config.params).toEqual({ transferMethod: "eth", name: "alice.eth" });
      return [200, resolved];
    });
    await expect(
      ok.resolveAddress({ transferMethod: "eth", name: "alice.eth" }),
    ).resolves.toEqual(resolved);

    const failing = createClient(() => apiError(422, "No address returned."));
    await expect(
      failing.resolveAddress({ transferMethod: "btc", name: "alice.eth" }),
    ).rejects.toMatchObject({ code: 422 });
  });

  it("getGuaranteePublicKey returns text and rejects a missing certificate", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/guarantee/public-key");
      expect(config.responseType).toBe("text");
      return [200, "-----BEGIN PGP PUBLIC KEY BLOCK-----"];
    });
    await expect(ok.getGuaranteePublicKey()).resolves.toBe("-----BEGIN PGP PUBLIC KEY BLOCK-----");

    const failing = createClient(() => apiError(404, "Verification certificates are not provisioned"));
    await expect(failing.getGuaranteePublicKey()).rejects.toMatchObject({ code: 404 });
  });

  it("getOrderGuarantee returns the letter and rejects a missing letter", async () => {
    const ok = createClient((config) => {
      expect(config.url).toBe("/api/orders/BV2MTZAF/guarantee");
      expect(config.responseType).toBe("text");
      return [200, "-----BEGIN PGP SIGNED MESSAGE-----"];
    });
    await expect(ok.getOrderGuarantee("BV2MTZAF")).resolves.toBe(
      "-----BEGIN PGP SIGNED MESSAGE-----",
    );

    const failing = createClient(() => apiError(403, "Caller does not own the order"));
    await expect(failing.getOrderGuarantee("BV2MTZAF")).rejects.toMatchObject({ code: 403 });
  });

  it("turns a transport failure into BitcoinVnError", async () => {
    const http = axios.create();
    const mock = new MockAdapter(http);
    mock.onAny().networkError();
    const client = new BitcoinVn({ axios: http });
    await expect(client.getHealth()).rejects.toMatchObject({ status: 0, code: 0 });
  });
});
