import axios, { type AxiosRequestConfig } from "axios";
import MockAdapter from "axios-mock-adapter";

import {
  GrizzlyPartner,
  GrizzlySms,
  GrizzlySmsError,
  HttpStatusError,
  NetworkError,
  NoNumbersError,
  RentAction,
  ServiceProhibitedError,
  TimeoutError,
  parseActivationWebhook,
  parsePartnerRequest,
  partnerFinishResponse,
  partnerNumberResponse,
  partnerServicesResponse,
} from "../src/index.js";

type Reply = [number, unknown] | Promise<[number, unknown]>;

function createSms(
  reply: (config: AxiosRequestConfig) => Reply,
  options: { retries?: number; retryDelayMs?: number; retryMutations?: boolean } = {},
) {
  const http = axios.create();
  const mock = new MockAdapter(http);
  mock.onAny().reply((config) => reply(config));
  const sms = new GrizzlySms({ apiKey: "secret", axios: http, retryDelayMs: 0, ...options });
  return { sms, mock };
}

function paramsOf(config: AxiosRequestConfig): Record<string, string> {
  const params = config.params as Record<string, string> | undefined;
  return params ?? {};
}

describe("errors and retries", () => {
  it("maps known codes to subclasses, including a suffixed price error", async () => {
    const failing = createSms(() => [200, "WRONG_MAX_PRICE:0.50"]);
    await expect(failing.sms.getNumber({ service: "tg" })).rejects.toMatchObject({
      code: "WRONG_MAX_PRICE",
      name: "WrongMaxPriceError",
    });

    const jsonError = createSms(() => [200, { status: "error", error: "NO_NUMBERS" }]);
    await expect(jsonError.sms.getRentStatus(1)).rejects.toBeInstanceOf(NoNumbersError);

    const empty = createSms(() => [200, "   "]);
    await expect(empty.sms.call("getBalance")).rejects.toMatchObject({ code: "EMPTY_RESPONSE" });

    const http = createSms(() => [503, "down"]);
    await expect(http.sms.getBalance()).rejects.toBeInstanceOf(HttpStatusError);
  });

  it("retries a read after ERROR_SQL and does not retry a purchase", async () => {
    let reads = 0;
    const sms = createSms(
      () => {
        reads += 1;
        return reads === 1 ? [200, "ERROR_SQL"] : [200, "ACCESS_BALANCE:3"];
      },
      { retries: 1 },
    );
    await expect(sms.sms.getBalance({ version: 2 })).resolves.toBe(3);
    expect(reads).toBe(2);

    let buys = 0;
    const buying = createSms(
      () => {
        buys += 1;
        return [200, "SERVER_ERROR"];
      },
      { retries: 3 },
    );
    await expect(buying.sms.getNumber({ service: "tg" })).rejects.toMatchObject({
      code: "SERVER_ERROR",
    });
    expect(buys).toBe(1);
  });

  it("retries a network failure on getBalance and surfaces NETWORK", async () => {
    let calls = 0;
    const http = axios.create();
    const mock = new MockAdapter(http);
    mock.onAny().reply(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error("ECONNRESET"));
      return [200, "ACCESS_BALANCE:1"];
    });
    const sms = new GrizzlySms({ apiKey: "secret", axios: http, retries: 1, retryDelayMs: 0 });
    await expect(sms.getBalance()).resolves.toBe(1);

    const dead = axios.create();
    new MockAdapter(dead).onAny().reply(() => Promise.reject(new Error("ECONNRESET")));
    const once = new GrizzlySms({ apiKey: "secret", axios: dead, retryDelayMs: 0 });
    await expect(once.getBalance()).rejects.toBeInstanceOf(NetworkError);
  });

  it("retries a purchase only when retryMutations is set", async () => {
    let calls = 0;
    const http = axios.create();
    new MockAdapter(http).onAny().reply(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error("ECONNRESET"));
      return [200, "ACCESS_NUMBER:1:7900"];
    });
    const sms = new GrizzlySms({
      apiKey: "secret",
      axios: http,
      retries: 1,
      retryDelayMs: 0,
      retryMutations: true,
    });
    await expect(sms.getNumber({ service: "tg" })).resolves.toEqual({
      activationId: "1",
      phoneNumber: "7900",
    });
    expect(calls).toBe(2);
  });

  it("rejects a proxy URL without a host and applies a valid proxy", () => {
    expect(() => new GrizzlySms({ apiKey: "k", proxy: "not a url" })).toThrow(GrizzlySmsError);
    const created = jest.spyOn(axios, "create");
    new GrizzlySms({
      apiKey: "k",
      baseUrl: "https://example.test/",
      timeoutMs: 1500,
      proxy: "http://user:p%40ss@127.0.0.1:8888",
    });
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://example.test",
        timeout: 1500,
        proxy: {
          protocol: "http",
          host: "127.0.0.1",
          port: 8888,
          auth: { username: "user", password: "p@ss" },
        },
      }),
    );
    created.mockRestore();
  });
});

describe("catalog, stock, rent, wait, and webhook", () => {
  it("sends operator, forward, and activationType on getNumber", async () => {
    const { sms } = createSms((config) => {
      const params = paramsOf(config);
      expect(params.operator).toBe("mts");
      expect(params.forward).toBe("1");
      expect(params.activationType).toBe("2");
      expect(params.ref_id).toBe("tysik");
      return [200, "ACCESS_NUMBER:9:100"];
    });
    await sms.getNumber({
      service: "tg",
      operator: "mts",
      forward: true,
      activationType: 2,
    });
  });

  it("passes forward on setStatus", async () => {
    const { sms } = createSms((config) => {
      expect(paramsOf(config).forward).toBe("0");
      expect(paramsOf(config).status).toBe("6");
      return [200, "ACCESS_ACTIVATION"];
    });
    await expect(sms.setStatus(5, 6, false)).resolves.toBe("ACCESS_ACTIVATION");
  });

  it("parses getNumbersStatus and skips non-numeric rows", async () => {
    const { sms } = createSms((config) => {
      expect(paramsOf(config).action).toBe("getNumbersStatus");
      expect(paramsOf(config).country).toBe("0");
      expect(paramsOf(config).operator).toBe("any");
      return [200, { tg_0: 20, wa_1: 3, note: "x" }];
    });
    await expect(sms.getNumbersStatus({ country: 0, operator: "any" })).resolves.toEqual([
      { key: "tg_0", service: "tg", suffix: "0", count: 20 },
      { key: "wa_1", service: "wa", suffix: "1", count: 3 },
    ]);
  });

  it("covers the rent lifecycle", async () => {
    const { sms } = createSms((config) => {
      const action = paramsOf(config).action;
      if (action === "getRentNumber") {
        expect(paramsOf(config).rent_time).toBe("4");
        return [200, { status: "success", phone: { id: 7, endDate: "2026-01-01", number: "7900" } }];
      }
      if (action === "continueRentNumber") {
        return [200, { status: "success", phone: { id: "7", endDate: "2026-01-02", number: "7900" } }];
      }
      if (action === "getRentStatus") {
        return [
          200,
          {
            status: "success",
            quantity: "1",
            values: { "0": { phoneFrom: "100", service: "tg", test: "4321", date: "today" } },
          },
        ];
      }
      if (action === "setRentStatus") {
        expect(["1", "2"]).toContain(paramsOf(config).status);
        expect([RentAction.Finish, RentAction.Cancel].map(String)).toContain(paramsOf(config).status);
        return [200, { status: "success" }];
      }
      if (action === "getRentHistory") {
        return [
          200,
          { status: "success", quantity: "1", values: { "1": { date: "d", price: 3.6, hours: 4 } } },
        ];
      }
      if (action === "getRentPrices") {
        return [
          200,
          { status: "success", values: { "0": { tg: { cost: 12, count: 15, max_hours: 10 } } } },
        ];
      }
      return [200, "BAD_ACTION"];
    });
    await expect(
      sms.getRentNumber({ service: "tg", country: 0, rentTime: 4 }),
    ).resolves.toEqual({ id: "7", number: "7900", endDate: "2026-01-01" });
    await expect(sms.continueRent(7, 4)).resolves.toMatchObject({ id: "7" });
    await expect(sms.getRentStatus(7)).resolves.toEqual({
      quantity: 1,
      messages: [{ phoneFrom: "100", service: "tg", text: "4321", date: "today" }],
    });
    await expect(sms.finishRent(7)).resolves.toBe("success");
    await expect(sms.cancelRent(7)).resolves.toBe("success");
    await expect(sms.getRentHistory(7)).resolves.toEqual({
      quantity: 1,
      entries: [{ date: "d", price: 3.6, hours: 4 }],
    });
    await expect(sms.getRentPrices({ service: "tg", country: 0, rentTime: 4 })).resolves.toEqual([
      { country: "0", service: "tg", cost: 12, count: 15, maxHours: 10 },
    ]);
  });

  it("rejects a blank rent service and a rent body without a phone", async () => {
    const { sms } = createSms((config) => {
      if (paramsOf(config).action === "setRentStatus") return [200, { status: "nope" }];
      return [200, { status: "success" }];
    });
    await expect(sms.getRentNumber({ service: " ", country: 0, rentTime: 4 })).rejects.toMatchObject({
      code: "BAD_SERVICE",
    });
    await expect(sms.getRentNumber({ service: "tg", country: 0, rentTime: 4 })).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE",
    });
    await expect(sms.setRentStatus(1, 1)).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("waitForMessage returns an SMS code and times out", async () => {
    const { sms } = createSms(() => [
      200,
      { verificationType: 2, sms: { code: "852508", text: "code 852508" }, call: null },
    ]);
    const seen: unknown[] = [];
    await expect(
      sms.waitForMessage(1, { intervalMs: 0, timeoutMs: 1000, onStatus: (status) => seen.push(status) }),
    ).resolves.toEqual({
      code: "852508",
      text: "code 852508",
      source: "sms",
      verificationType: 2,
    });
    expect(seen).toHaveLength(1);

    const calls = createSms(() => [
      200,
      { call: { code: "100", text: "100" } },
    ]);
    await expect(calls.sms.waitForMessage(1, { intervalMs: 0, timeoutMs: 1000 })).resolves.toMatchObject({
      source: "call",
      code: "100",
    });

    const slow = createSms(() => [200, { sms: null, call: null }]);
    await expect(slow.sms.waitForMessage(1, { intervalMs: 0, timeoutMs: 0 })).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });

  it("activate orders, marks ready, waits, and cancels on timeout", async () => {
    const actions: string[] = [];
    const { sms } = createSms((config) => {
      const action = paramsOf(config).action;
      actions.push(action);
      if (action === "getNumberV2") {
        return [200, { activationId: 3, phoneNumber: "7900", activationCost: 1, currency: 840, countryCode: "0", canGetAnotherSms: "1", activationTime: "t" }];
      }
      if (action === "setStatus") return [200, "ACCESS_READY"];
      return [200, "STATUS_OK:5555"];
    });
    const statuses: string[] = [];
    await expect(
      sms.activate(
        { service: "tg", country: 0 },
        { intervalMs: 0, timeoutMs: 1000, onStatus: (status) => statuses.push(status.status) },
      ),
    ).resolves.toMatchObject({ code: "5555", order: { activationId: "3" } });
    expect(actions).toEqual(["getNumberV2", "setStatus", "getStatus"]);
    expect(statuses).toEqual(["STATUS_OK"]);

    const lateActions: string[] = [];
    const late = createSms((config) => {
      const action = paramsOf(config).action;
      lateActions.push(`${action}:${paramsOf(config).status ?? ""}`);
      if (action === "getNumberV2") {
        return [200, { activationId: 4, phoneNumber: "7901", activationCost: 1, currency: 840, countryCode: "0", canGetAnotherSms: 0, activationTime: "t" }];
      }
      if (action === "getStatus") return [200, "STATUS_WAIT_CODE"];
      return [200, "ACCESS_CANCEL"];
    });
    await expect(
      late.sms.activate(
        { service: "tg" },
        { ready: false, intervalMs: 0, timeoutMs: 0, cancelOnTimeout: true },
      ),
    ).rejects.toBeInstanceOf(TimeoutError);
    expect(lateActions).toContain("setStatus:8");
  });

  it("aborts waitForCode and waitForMessage", async () => {
    const { sms } = createSms(() => [200, "STATUS_WAIT_CODE"]);
    const signal = AbortSignal.abort();
    await expect(sms.waitForCode(1, { signal, intervalMs: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "ABORTED",
    });
    const v2 = createSms(() => [200, {}]);
    await expect(v2.sms.waitForMessage(1, { signal, intervalMs: 0, timeoutMs: 1000 })).rejects.toMatchObject({
      code: "ABORTED",
    });
  });

  it("parses a webhook and keeps country visible flags", async () => {
    expect(
      parseActivationWebhook({
        activationId: 9,
        service: "tg",
        text: "code 1",
        code: "1",
        country: 0,
        receivedAt: "2026-01-01",
      }),
    ).toEqual({
      activationId: "9",
      service: "tg",
      text: "code 1",
      code: "1",
      country: "0",
      receivedAt: "2026-01-01",
    });
    expect(() => parseActivationWebhook({})).toThrow();

    const { sms } = createSms(() => [
      200,
      { "16": { id: 16, eng: "England", visible: 1, retry: 0 } },
    ]);
    await expect(sms.getCountries()).resolves.toEqual([
      {
        id: 16,
        rus: undefined,
        eng: "England",
        chn: undefined,
        tur: undefined,
        spa: undefined,
        hin: undefined,
        ara: undefined,
        fra: undefined,
        visible: 1,
        retry: 0,
      },
    ]);
  });

  it("reports a prohibited service as its subclass", async () => {
    const { sms } = createSms(() => [200, "The service is prohibited for sale by administration"]);
    await expect(sms.getNumber({ service: "xx" })).rejects.toBeInstanceOf(ServiceProhibitedError);
  });
});

describe("remaining branches", () => {
  it("covers string bodies, filters, retries, abort, and parser rejects", async () => {
    const strings = createSms(() => [200, "NOT_A_CODE"]);
    await expect(strings.sms.getNumberV2({ service: "tg" })).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE",
    });
    await expect(strings.sms.getServices()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getCountries()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getActiveActivations()).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE",
    });
    await expect(strings.sms.getNumbersStatus()).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE",
    });
    await expect(strings.sms.getRentNumber({ service: "tg", country: 0, rentTime: 4 })).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE",
    });
    await expect(strings.sms.continueRent(1, 4)).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getRentStatus(1)).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getRentHistory(1)).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getRentPrices()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getPrices()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getBalance()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(strings.sms.getNumber({ service: " " })).rejects.toMatchObject({ code: "BAD_SERVICE" });
    await expect(strings.sms.setStatus(1, 1)).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });

    const filtered = createSms(() => [
      200,
      {
        "1": { tg: { cost: 2, count: 5 }, wa: { cost: "x", count: 1 } },
        "2": "skip",
      },
    ]);
    await expect(
      filtered.sms.findPrices({ service: "tg", country: 1, minCount: 1, maxPrice: 3 }),
    ).resolves.toEqual([{ country: "1", service: "tg", cost: 2, count: 5 }]);

    const wallet = createSms((config) => {
      expect(paramsOf(config).coin).toBe("usdt");
      return [200, {}];
    });
    await expect(wallet.sms.getWallet()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });

    let httpCalls = 0;
    const retried = createSms(
      () => {
        httpCalls += 1;
        return httpCalls === 1 ? [503, "down"] : [200, "ACCESS_BALANCE:8"];
      },
      { retries: 1 },
    );
    await expect(retried.sms.getBalance()).resolves.toBe(8);

    const sql = createSms(
      (config) => {
        const action = paramsOf(config).action;
        if (action === "getCountries") {
          return [200, { status: "error", error: "ERROR_SQL" }];
        }
        return [200, [{ code: "tg", name: "Telegram" }]];
      },
      { retries: 1 },
    );
    await expect(sql.sms.getServices()).resolves.toEqual([{ code: "tg", name: "Telegram" }]);

    const plain = createSms(() => [200, { nope: "x" }], { retries: 1 });
    await expect(plain.sms.getNumbersStatus()).resolves.toEqual([]);

    const { sms } = createSms(() => [200, "STATUS_WAIT_CODE"]);
    const controller = new AbortController();
    const pending = sms.waitForCode(1, {
      intervalMs: 50,
      timeoutMs: 5_000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 10);
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });

    const lateAbort = new AbortController();
    const gating = createSms(() => {
      lateAbort.abort();
      return [200, "STATUS_WAIT_CODE"];
    });
    await expect(
      gating.sms.waitForCode(1, { intervalMs: 20, timeoutMs: 5_000, signal: lateAbort.signal }),
    ).rejects.toMatchObject({ code: "ABORTED" });

    const cancelBoom = createSms((config) => {
      const action = paramsOf(config).action;
      if (action === "getNumberV2") {
        return [200, { activationId: 1, phoneNumber: "1", activationCost: 1, currency: 1, countryCode: "0", canGetAnotherSms: false, activationTime: "t" }];
      }
      if (action === "getStatus") return [500, "down"];
      return [500, "down"];
    });
    await expect(
      cancelBoom.sms.activate({ service: "tg" }, { ready: false, cancelOnError: true, intervalMs: 0, timeoutMs: 1000 }),
    ).rejects.toBeInstanceOf(HttpStatusError);

    await expect(
      createSms(() => [200, "ACCESS_NUMBER:1:2"]).sms.getNumber({
        service: "tg",
        forward: 2,
        phoneException: [" ", ""],
        providerIds: [],
      }),
    ).resolves.toEqual({ activationId: "1", phoneNumber: "2" });
  });

  it("covers partner network, http, and default filename", async () => {
    const http = axios.create();
    const mock = new MockAdapter(http);
    mock.onPost("/agent/api/sms").reply(500, "nope");
    const partner = new GrizzlyPartner({ key: "k", axios: http });
    await expect(
      partner.pushSms({ smsId: 1, phone: 1, phoneFrom: "a", text: "t" }),
    ).rejects.toMatchObject({ code: "HTTP_500" });

    const broken = axios.create();
    new MockAdapter(broken).onPost("/agent/api/sms").reply(() => Promise.reject("boom"));
    const network = new GrizzlyPartner({ key: "k", axios: broken });
    await expect(
      network.pushCall({ callId: 1, phone: 1, phoneFrom: "a" }),
    ).rejects.toMatchObject({ code: "NETWORK" });

    const ok = axios.create();
    new MockAdapter(ok).onPost("/agent/api/sms").reply((config) => {
      const data = config.data as FormData;
      expect(data.get("file")).toBeTruthy();
      return [200, { status: "SUCCESS" }];
    });
    const recording = new GrizzlyPartner({ key: "k", axios: ok });
    await expect(
      recording.pushCallRecord({
        callId: 1,
        phone: 1,
        phoneFrom: "a",
        file: new Blob(["x"]),
      }),
    ).resolves.toMatchObject({ status: "SUCCESS" });

    await expect(
      createPartnerRaw().pushSms({ smsId: 1, phone: 1, phoneFrom: "a", text: "t" }),
    ).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});

function createPartnerRaw() {
  const http = axios.create();
  new MockAdapter(http).onPost("/agent/api/sms").reply(200, "nope");
  return new GrizzlyPartner({ key: "k", axios: http });
}

describe("partner inbound helpers", () => {
  it("parses the three inbound actions and builds replies", () => {
    expect(parsePartnerRequest({ action: "GET_SERVICES", key: "k" })).toEqual({
      action: "GET_SERVICES",
      key: "k",
    });
    expect(
      parsePartnerRequest({
        action: "GET_NUMBER",
        key: "k",
        country: 12,
        operator: "any",
        service: "tg",
        sum: 1.5,
        exceptionPhoneSet: ["447"],
        canGetAnotherSms: true,
      }),
    ).toMatchObject({ action: "GET_NUMBER", service: "tg", country: 12 });
    expect(
      parsePartnerRequest({ action: "FINISH_ACTIVATION", key: "k", activationId: 4, status: 3 }),
    ).toEqual({ action: "FINISH_ACTIVATION", key: "k", activationId: 4, status: 3 });
    expect(() => parsePartnerRequest({ action: "NOPE", key: "k" })).toThrow();
    expect(() => parsePartnerRequest({ action: "FINISH_ACTIVATION", key: "k", status: 9 })).toThrow();
    expect(() => parsePartnerRequest(null)).toThrow();
    expect(() => parsePartnerRequest({ action: "GET_SERVICES" })).toThrow();

    expect(partnerServicesResponse([])).toEqual({ status: "SUCCESS", countryList: [] });
    expect(partnerNumberResponse({ number: 1, activationId: 2 })).toMatchObject({
      status: "SUCCESS",
      number: 1,
    });
    expect(partnerFinishResponse()).toEqual({ status: "SUCCESS" });
    expect(partnerFinishResponse("busy")).toEqual({ status: "ERROR", error: "busy" });
  });

  it("applies a partner proxy when no axios instance is injected", () => {
    const created = jest.spyOn(axios, "create");
    new GrizzlyPartner({ key: "k", proxy: "http://127.0.0.1:9" });
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({
        proxy: { protocol: "http", host: "127.0.0.1", port: 9, auth: undefined },
      }),
    );
    created.mockRestore();
  });
});
