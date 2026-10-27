import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import {
  CapMonster,
  CapMonsterError,
  DEFAULT_SOFT_ID,
  dataDomeTask,
  imageToTextTask,
  recaptchaV2Task,
  tenDITask,
  turnstileTask,
} from "../src/index.js";

describe("CapMonster client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("throws when clientKey is missing", () => {
    expect(() => new CapMonster("")).toThrow(CapMonsterError);
    expect(() => new CapMonster({ clientKey: "  " })).toThrow("Client key is required");
  });

  it("leaves softId empty until the developer program assigns one", () => {
    expect(DEFAULT_SOFT_ID).toBe("");
  });

  it("fetches account balance", async () => {
    const client = new CapMonster("test_key");

    mock.onPost("https://api.capmonster.cloud/getBalance").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.softId).toBeUndefined();

      return [200, { errorId: 0, balance: 345.678 }];
    });

    const balance = await client.getBalance();
    expect(balance.balance).toBe(345.678);
  });

  it("creates a task and omits softId by default", async () => {
    const client = new CapMonster("test_key");

    mock.onPost("https://api.capmonster.cloud/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.softId).toBeUndefined();
      expect(body.task.type).toBe("TurnstileTask");
      expect(body.task.websiteURL).toBe("https://example.com");
      expect(body.task.websiteKey).toBe("0x4AAAAAAA");

      return [200, { errorId: 0, taskId: 7654321 }];
    });

    const taskId = await client.createTask(
      turnstileTask({
        websiteURL: "https://example.com",
        websiteKey: "0x4AAAAAAA",
      }),
    );

    expect(taskId).toBe(7654321);
  });

  it("sends softId when configured", async () => {
    const client = new CapMonster({ clientKey: "test_key", softId: "9988" });

    mock.onPost("https://api.capmonster.cloud/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.softId).toBe(9988);
      expect(body.callbackUrl).toBe("https://example.com/callback");
      expect(body.task.type).toBe("RecaptchaV2Task");
      return [200, { errorId: 0, taskId: 42 }];
    });

    const taskId = await client.createTask(
      recaptchaV2Task({
        websiteURL: "https://example.com",
        websiteKey: "site-key",
      }),
      { callbackUrl: "https://example.com/callback" },
    );

    expect(taskId).toBe(42);
  });

  it("builds documented task payloads", () => {
    expect(
      imageToTextTask({ body: "aGVsbG8=", capMonsterModule: "yandex", case: true }).type,
    ).toBe("ImageToTextTask");

    const datadome = dataDomeTask({
      websiteURL: "https://example.com",
      metadata: { captchaUrl: "https://geo.captcha-delivery.com/captcha/", datadomeCookie: "datadome=1" },
      proxyType: "http",
      proxyAddress: "1.2.3.4",
      proxyPort: 8080,
    });
    expect(datadome.type).toBe("CustomTask");
    expect(datadome.class).toBe("DataDome");

    const tendi = tenDITask({
      websiteURL: "https://example.com",
      websiteKey: "189123456",
    });
    expect(tendi.class).toBe("TenDI");
  });

  it("gets task result", async () => {
    const client = new CapMonster("test_key");

    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.taskId).toBe(7654321);

      return [
        200,
        {
          errorId: 0,
          status: "ready",
          solution: { gRecaptchaResponse: "token_value" },
        },
      ];
    });

    const result = await client.getTaskResult<{ gRecaptchaResponse: string }>(7654321);
    expect(result.status).toBe("ready");
    expect(result.solution?.gRecaptchaResponse).toBe("token_value");
  });

  it("treats CAPTCHA_NOT_READY as still processing", async () => {
    const client = new CapMonster("test_key");

    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(200, {
      errorId: 1,
      errorCode: "CAPTCHA_NOT_READY",
      errorDescription: "The captcha is not ready yet",
    });

    const result = await client.getTaskResult(7654321);
    expect(result.status).toBe("processing");
    expect(result.solution).toBeUndefined();
  });

  it("waitForResult polls until ready", async () => {
    const client = new CapMonster("test_key");

    let calls = 0;
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(() => {
      calls += 1;
      if (calls === 1) {
        return [200, { errorId: 0, status: "processing" }];
      }
      return [
        200,
        {
          errorId: 0,
          status: "ready",
          solution: { token: "token_poll_done" },
        },
      ];
    });

    const solution = await client.waitForResult<{ token: string }>(7654321, {
      intervalMs: 10,
      timeoutMs: 1000,
    });

    expect(solution.token).toBe("token_poll_done");
    expect(calls).toBe(2);
  });

  it("handles an invalid client key", async () => {
    const client = new CapMonster("bad_key");

    mock.onPost("https://api.capmonster.cloud/getBalance").reply(200, {
      errorId: 1,
      errorCode: "ERROR_KEY_DOES_NOT_EXIST",
      errorDescription: "Account authorization key not found in the system or has incorrect format",
    });

    try {
      await client.getBalance();
      fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CapMonsterError);
      const apiErr = err as CapMonsterError;
      expect(apiErr.errorId).toBe(1);
      expect(apiErr.errorCode).toBe("ERROR_KEY_DOES_NOT_EXIST");
      expect(apiErr.message).toContain("authorization key");
    }
  });

  it("handles zero balance on createTask", async () => {
    const client = new CapMonster("test_key");

    mock.onPost("https://api.capmonster.cloud/createTask").reply(200, {
      errorId: 1,
      errorCode: "ERROR_ZERO_BALANCE",
      errorDescription: "Account has zero balance",
    });

    await expect(
      client.createTask(
        recaptchaV2Task({
          websiteURL: "https://example.com",
          websiteKey: "site-key",
        }),
      ),
    ).rejects.toMatchObject({
      errorCode: "ERROR_ZERO_BALANCE",
      errorId: 1,
    });
  });

  it("uses the local catalog when errorDescription is missing", async () => {
    const client = new CapMonster("test_key");

    mock.onPost("https://api.capmonster.cloud/createTask").reply(200, {
      errorId: 1,
      errorCode: "ERROR_ZERO_BALANCE",
    });

    await expect(
      client.createTask({ type: "ImageToTextTask", body: "abc" }),
    ).rejects.toThrow("Insufficient funds");
  });

  it("handles HTTP 500 network failure", async () => {
    const client = new CapMonster("test_key");

    mock.onPost("https://api.capmonster.cloud/getBalance").reply(500, {
      errorDescription: "Server Error",
    });

    await expect(client.getBalance()).rejects.toThrow(CapMonsterError);
  });
});
