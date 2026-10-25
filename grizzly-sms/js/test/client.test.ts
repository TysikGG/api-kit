import axios, { type AxiosRequestConfig } from "axios";
import MockAdapter from "axios-mock-adapter";

import {
  ActivationAction,
  GrizzlySms,
  GrizzlySmsError,
  flattenPrices,
} from "../src/index.js";

type Reply = [number, unknown];

function createSms(reply: (config: AxiosRequestConfig) => Reply, apiKey = "secret") {
  const http = axios.create();
  const mock = new MockAdapter(http);
  mock.onAny().reply((config) => reply(config));
  const sms = new GrizzlySms({ apiKey, axios: http });
  return { sms, mock };
}

function paramsOf(config: AxiosRequestConfig): Record<string, string> {
  const params = config.params as Record<string, string> | URLSearchParams | undefined;
  if (!params) return {};
  if (typeof (params as URLSearchParams).entries === "function" && !("action" in params)) {
    return Object.fromEntries([...(params as URLSearchParams).entries()]);
  }
  return params as Record<string, string>;
}

describe("GrizzlySms", () => {
  it("rejects a blank API key", () => {
    expect(() => new GrizzlySms({ apiKey: "  " })).toThrow(GrizzlySmsError);
    expect(() => new GrizzlySms("  ")).toThrow(GrizzlySmsError);
  });

  it("call returns an unknown action body and throws a known API error", async () => {
    const ok = createSms((config) => {
      const params = paramsOf(config);
      expect(params.action).toBe("customAction");
      expect(params.api_key).toBe("secret");
      expect(params.ref_id).toBe("tysik");
      expect(config.url).toBe("/stubs/handler_api.php");
      return [200, "OK"];
    });
    await expect(ok.sms.call("customAction", { note: "1" })).resolves.toBe("OK");

    const failing = createSms(() => [200, "BAD_ACTION"]);
    await expect(failing.sms.call("customAction")).rejects.toMatchObject({
      code: "BAD_ACTION",
    });
  });

  it("getBalance parses ACCESS_BALANCE and rejects BAD_KEY", async () => {
    const { sms } = createSms((config) => {
      const params = paramsOf(config);
      expect(params.action).toBe("getBalance");
      expect(params.ref_id).toBe("tysik");
      return [200, "ACCESS_BALANCE:210.05"];
    });
    await expect(sms.getBalance()).resolves.toBe(210.05);

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getBalance()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("getNumber maps filters and rejects NO_NUMBERS", async () => {
    const { sms } = createSms((config) => {
      const params = paramsOf(config);
      expect(params.action).toBe("getNumber");
      expect(params.service).toBe("tg");
      expect(params.country).toBe("any");
      expect(params.maxPrice).toBe("1.5");
      expect(params.minPrice).toBe("0.2");
      expect(params.providerIds).toBe("1,2");
      expect(params.exceptProviderIds).toBe("9");
      expect(params.phoneException).toBe("1628,147220");
      return [200, "ACCESS_NUMBER:38496653:66846426435"];
    });
    await expect(
      sms.getNumber({
        service: "tg",
        country: "any",
        maxPrice: 1.5,
        minPrice: 0.2,
        providerIds: [1, 2],
        exceptProviderIds: "9",
        phoneException: ["1628", "147220"],
      }),
    ).resolves.toEqual({
      activationId: "38496653",
      phoneNumber: "66846426435",
    });

    const failing = createSms(() => [200, "NO_NUMBERS"]);
    await expect(failing.sms.getNumber({ service: "tg" })).rejects.toMatchObject({
      code: "NO_NUMBERS",
    });
  });

  it("getNumberV2 normalizes the JSON payload and rejects NO_NUMBERS", async () => {
    const { sms } = createSms(() => [
      200,
      {
        activationCancel: "2026-05-07 14:03:16",
        activationCost: 0.35,
        activationEnd: "2026-05-07 14:18:16",
        activationId: 495357953,
        activationTime: "2026-05-07 13:58:16",
        canGetAnotherSms: "0",
        countryCode: "12",
        currency: 643,
        phoneNumber: "18036181752",
      },
    ]);
    await expect(sms.getNumberV2({ service: "tg", country: 12 })).resolves.toMatchObject({
      activationId: "495357953",
      canGetAnotherSms: false,
      activationCost: 0.35,
      activationCancel: "2026-05-07 14:03:16",
    });

    const failing = createSms(() => [200, "NO_NUMBERS"]);
    await expect(failing.sms.getNumberV2({ service: "tg" })).rejects.toMatchObject({
      code: "NO_NUMBERS",
    });
  });

  it("setStatus returns ACCESS_ACTIVATION and rejects BAD_STATUS", async () => {
    const { sms } = createSms((config) => {
      const params = paramsOf(config);
      expect(params.action).toBe("setStatus");
      expect(params.id).toBe("7");
      expect(params.status).toBe(String(ActivationAction.Complete));
      return [200, "ACCESS_ACTIVATION"];
    });
    await expect(sms.setStatus(7, ActivationAction.Complete)).resolves.toBe("ACCESS_ACTIVATION");

    const failing = createSms(() => [200, "BAD_STATUS"]);
    await expect(failing.sms.setStatus(7, 6)).rejects.toMatchObject({ code: "BAD_STATUS" });
  });

  it.each([
    ["ready", 1, "ACCESS_READY"],
    ["requestAnotherCode", 3, "ACCESS_RETRY_GET"],
    ["complete", 6, "ACCESS_ACTIVATION"],
  ] as const)("%s sends status %s", async (method, status, body) => {
    const { sms } = createSms((config) => {
      expect(paramsOf(config).status).toBe(String(status));
      return [200, body];
    });
    const call = sms[method].bind(sms) as (id: number) => Promise<string>;
    await expect(call(7)).resolves.toBe(body);

    const failing = createSms(() => [200, "BAD_STATUS"]);
    const fail = failing.sms[method].bind(failing.sms) as (id: number) => Promise<string>;
    await expect(fail(7)).rejects.toMatchObject({ code: "BAD_STATUS" });
  });

  it("cancel defaults to status 8 and accepts the alternate -1", async () => {
    const seen: string[] = [];
    const { sms } = createSms((config) => {
      seen.push(paramsOf(config).status);
      return [200, "ACCESS_CANCEL"];
    });
    await expect(sms.cancel(7)).resolves.toBe("ACCESS_CANCEL");
    await expect(sms.cancel(7, -1)).resolves.toBe("ACCESS_CANCEL");
    expect(seen).toEqual(["8", "-1"]);

    const failing = createSms(() => [200, "BAD_STATUS"]);
    await expect(failing.sms.cancel(7)).rejects.toMatchObject({ code: "BAD_STATUS" });
  });

  it("getStatus parses STATUS_OK and rejects NO_ACTIVATION", async () => {
    const { sms } = createSms(() => [200, "STATUS_OK:852508"]);
    await expect(sms.getStatus(7)).resolves.toEqual({ status: "STATUS_OK", code: "852508" });

    const failing = createSms(() => [200, "NO_ACTIVATION"]);
    await expect(failing.sms.getStatus(7)).rejects.toMatchObject({ code: "NO_ACTIVATION" });
  });

  it("getStatusV2 returns the JSON body and rejects NO_ACTIVATION", async () => {
    const body = {
      verificationType: 0,
      sms: { code: "852508", text: "code 852508" },
      call: null,
    };
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getStatusV2");
      return [200, body];
    });
    await expect(sms.getStatusV2(7)).resolves.toEqual(body);

    const failing = createSms(() => [200, "NO_ACTIVATION"]);
    await expect(failing.sms.getStatusV2(7)).rejects.toMatchObject({ code: "NO_ACTIVATION" });
  });

  it("waitForCode polls until STATUS_OK and rejects STATUS_CANCEL", async () => {
    const statuses = ["STATUS_WAIT_CODE", "STATUS_OK:852508"];
    const { sms } = createSms(() => [200, statuses.shift()]);
    await expect(sms.waitForCode(7, { intervalMs: 0, timeoutMs: 5_000 })).resolves.toEqual({
      code: "852508",
      status: "STATUS_OK",
    });

    const failing = createSms(() => [200, "STATUS_CANCEL"]);
    await expect(failing.sms.waitForCode(1, { intervalMs: 0, timeoutMs: 10 })).rejects.toMatchObject(
      { code: "STATUS_CANCEL" },
    );
  });

  it("getPrices returns the table and rejects BAD_KEY", async () => {
    const table = { "16": { tg: { cost: 1.3, count: 20 } } };
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getPrices");
      expect(paramsOf(config).service).toBe("tg");
      return [200, table];
    });
    await expect(sms.getPrices({ service: "tg" })).resolves.toEqual(table);

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getPrices()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("getPricesV2 returns buckets and rejects BAD_KEY", async () => {
    const table = { "0": { tg: { "0.2": 5 } } };
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getPricesV2");
      return [200, table];
    });
    await expect(sms.getPricesV2({ service: "tg", country: 0 })).resolves.toEqual(table);

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getPricesV2()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("getPricesV3 returns provider offers and rejects BAD_KEY", async () => {
    const table = {
      "0": { tg: { price: 0.2, count: 5, providers: { a: { count: 5, price: [0.2], provider_id: 1 } } } },
    };
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getPricesV3");
      return [200, table];
    });
    await expect(sms.getPricesV3({ service: "tg", country: 0 })).resolves.toEqual(table);

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getPricesV3()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("findPrices sorts and filters, and rejects NO_BALANCE", async () => {
    const table = {
      "16": { tg: { cost: 1.3, count: 20 } },
      "6": { tg: { cost: 0.4, count: 2 }, wa: { cost: 0.1, count: 100 } },
    };
    expect(flattenPrices(table)).toHaveLength(3);

    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getPrices");
      expect(paramsOf(config).service).toBe("tg");
      return [200, table];
    });
    await expect(sms.findPrices({ service: "tg", minCount: 10, maxPrice: 2 })).resolves.toEqual([
      { country: "16", service: "tg", cost: 1.3, count: 20 },
    ]);

    const failing = createSms(() => [200, "NO_BALANCE"]);
    await expect(failing.sms.findPrices({ service: "tg" })).rejects.toMatchObject({
      code: "NO_BALANCE",
    });
  });

  it("getServices parses the catalog and rejects BAD_KEY", async () => {
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getServicesList");
      return [200, { status: "success", services: [{ code: "kt", name: "KakaoTalk" }] }];
    });
    await expect(sms.getServices()).resolves.toEqual([{ code: "kt", name: "KakaoTalk" }]);

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getServices()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("getCountries parses a map and rejects BAD_KEY", async () => {
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getCountries");
      return [200, { "22": { id: 22, eng: "India", rus: "Индия" } }];
    });
    await expect(sms.getCountries()).resolves.toEqual([
      {
        id: 22,
        rus: "Индия",
        eng: "India",
        chn: undefined,
        tur: undefined,
        spa: undefined,
        hin: undefined,
        ara: undefined,
        fra: undefined,
      },
    ]);

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getCountries()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("getActiveActivations treats null as an empty list and rejects BAD_KEY", async () => {
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getActiveActivations");
      return [200, null];
    });
    await expect(sms.getActiveActivations()).resolves.toEqual([]);

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getActiveActivations()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("getWallet reads wallet_address and rejects BAD_KEY", async () => {
    const { sms } = createSms((config) => {
      expect(config.url).toBe("/public/crypto/wallet");
      const params = paramsOf(config);
      expect(params.api_key).toBe("secret");
      expect(params.coin).toBe("usdt");
      expect(params.network).toBe("tron");
      expect(params.ref_id).toBeUndefined();
      return [200, { wallet_address: "TAddr" }];
    });
    await expect(sms.getWallet()).resolves.toEqual({ walletAddress: "TAddr" });

    const failing = createSms(() => [200, "BAD_KEY"]);
    await expect(failing.sms.getWallet()).rejects.toMatchObject({ code: "BAD_KEY" });
  });

  it("maps a prohibited-service sentence to SERVICE_PROHIBITED", async () => {
    const { sms } = createSms(() => [
      200,
      "The service is prohibited for sale by administration",
    ]);
    await expect(sms.getNumber({ service: "xx" })).rejects.toMatchObject({
      code: "SERVICE_PROHIBITED",
    });
  });
});
