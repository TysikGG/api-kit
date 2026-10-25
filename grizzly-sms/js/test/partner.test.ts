import axios, { type AxiosRequestConfig } from "axios";
import MockAdapter from "axios-mock-adapter";

import { GrizzlyPartner, GrizzlySmsError } from "../src/index.js";

function bodyOf(data: unknown): Record<string, unknown> {
  if (typeof data === "string") return JSON.parse(data) as Record<string, unknown>;
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    return Object.fromEntries([...data.entries()]);
  }
  return (data ?? {}) as Record<string, unknown>;
}

function createPartner(reply: (config: AxiosRequestConfig) => [number, unknown]) {
  const http = axios.create();
  const mock = new MockAdapter(http);
  mock.onPost("/agent/api/sms").reply((config) => reply(config));
  return new GrizzlyPartner({ key: "qwerty123", axios: http });
}

describe("GrizzlyPartner", () => {
  it("rejects a blank partner key", () => {
    expect(() => new GrizzlyPartner({ key: "  " })).toThrow(GrizzlySmsError);
  });

  it("pushSms posts PUSH_SMS and throws when the status stays ERROR", async () => {
    const partner = createPartner((config) => {
      expect(config.url).toBe("/agent/api/sms");
      const body = bodyOf(config.data);
      expect(body).toMatchObject({
        action: "PUSH_SMS",
        key: "qwerty123",
        smsId: 1,
        phone: 447472190082,
        phoneFrom: "Microsoft",
        text: "code 5015",
      });
      return [200, { status: "SUCCESS" }];
    });
    await expect(
      partner.pushSms({
        smsId: 1,
        phone: 447472190082,
        phoneFrom: "Microsoft",
        text: "code 5015",
      }),
    ).resolves.toEqual({ status: "SUCCESS", error: undefined });

    const failing = createPartner(() => [200, { status: "ERROR", error: "busy" }]);
    await expect(
      failing.pushSms({
        smsId: 1,
        phone: 1,
        phoneFrom: "A",
        text: "code",
        retryDelayMs: 0,
      }),
    ).rejects.toMatchObject({ code: "ERROR" });
  });

  it("pushSms retries until SUCCESS", async () => {
    let calls = 0;
    const partner = createPartner(() => {
      calls += 1;
      if (calls === 1) return [200, { status: "ERROR", error: "busy" }];
      return [200, { status: "SUCCESS" }];
    });
    await expect(
      partner.pushSms({
        smsId: 1,
        phone: 447472190082,
        phoneFrom: "Microsoft",
        text: "code 5015",
        retries: 1,
        retryDelayMs: 0,
      }),
    ).resolves.toEqual({ status: "SUCCESS", error: undefined });
    expect(calls).toBe(2);
  });

  it("pushCall posts PUSH_CALL and throws ERROR", async () => {
    const partner = createPartner((config) => {
      expect(bodyOf(config.data)).toMatchObject({
        action: "PUSH_CALL",
        key: "qwerty123",
        callId: 10,
        phone: 447472190082,
        phoneFrom: "100",
      });
      return [200, { status: "SUCCESS" }];
    });
    await expect(
      partner.pushCall({ callId: 10, phone: 447472190082, phoneFrom: "100" }),
    ).resolves.toEqual({ status: "SUCCESS", error: undefined });

    const failing = createPartner(() => [200, { status: "ERROR", error: "busy" }]);
    await expect(
      failing.pushCall({
        callId: 10,
        phone: 1,
        phoneFrom: "100",
        retryDelayMs: 0,
      }),
    ).rejects.toMatchObject({ code: "ERROR" });
  });

  it("pushCallRecord posts multipart fields and throws ERROR", async () => {
    const partner = createPartner((config) => {
      const body = bodyOf(config.data);
      expect(body.action).toBe("PUSH_CALL_RECORD");
      expect(body.key).toBe("qwerty123");
      expect(String(body.callId)).toBe("10");
      expect(body.text).toBe("your code is 5015");
      return [200, { status: "SUCCESS" }];
    });
    await expect(
      partner.pushCallRecord({
        callId: 10,
        phone: 447472190082,
        phoneFrom: "100",
        text: "your code is 5015",
      }),
    ).resolves.toEqual({ status: "SUCCESS", error: undefined });

    const failing = createPartner(() => [200, { status: "ERROR", error: "busy" }]);
    await expect(
      failing.pushCallRecord({
        callId: 10,
        phone: 1,
        phoneFrom: "100",
        text: "code",
        retryDelayMs: 0,
      }),
    ).rejects.toMatchObject({ code: "ERROR" });
  });

  it("pushCallRecord requires text or file before sending", async () => {
    const partner = createPartner(() => [200, { status: "SUCCESS" }]);
    await expect(
      partner.pushCallRecord({ callId: 1, phone: 1, phoneFrom: "100" }),
    ).rejects.toMatchObject({ code: "BAD_ACTION" });
  });
});
