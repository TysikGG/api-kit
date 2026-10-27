import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import {
  DEFAULT_SOFT_ID,
  NextCaptcha,
  NextCaptchaError,
  funCaptchaTask,
  hCaptchaTask,
  recaptchaV2EnterpriseTask,
  recaptchaV2HsEnterpriseTask,
  recaptchaV2Task,
  recaptchaV3ProxylessTask,
  turnstileProxylessTask,
} from "../src/index.js";

describe("NextCaptcha client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("throws when clientKey is missing", () => {
    expect(() => new NextCaptcha("")).toThrow(NextCaptchaError);
    expect(() => new NextCaptcha({ clientKey: "  " })).toThrow("Client key is required");
  });

  it("uses the developer soft id by default", () => {
    expect(DEFAULT_SOFT_ID).toBe("next_softId_b3bdc0a2f7035cc72e1d62d575469f449d");
  });

  it("fetches account balance and parses the documented string", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/getBalance").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.softId).toBeUndefined();

      return [200, { errorId: 0, balance: "12.34" }];
    });

    const balance = await client.getBalance();
    expect(balance.balance).toBe(12.34);
  });

  it("creates a task and sends softId beside the task", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.softId).toBe(DEFAULT_SOFT_ID);
      expect(body.task.softId).toBeUndefined();
      expect(body.task.type).toBe("RecaptchaV2TaskProxyless");
      expect(body.task.websiteURL).toBe("https://example.com");
      expect(body.task.websiteKey).toBe("site-key");

      return [200, { errorId: 0, taskId: 1781234567890 }];
    });

    const taskId = await client.createTask(
      recaptchaV2Task({
        websiteURL: "https://example.com",
        websiteKey: "site-key",
      }),
    );

    expect(taskId).toBe(1781234567890);
  });

  it("lets the caller override softId and set callbackUrl", async () => {
    const client = new NextCaptcha({ clientKey: "test_key", softId: "custom-soft" });

    mock.onPost("https://api.nextcaptcha.com/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.softId).toBe("override-soft");
      expect(body.callbackUrl).toBe("https://example.com/callback");
      expect(body.task.type).toBe("RecaptchaV2EnterpriseTask");
      return [200, { errorId: 0, taskId: 42 }];
    });

    const taskId = await client.createTask(
      recaptchaV2EnterpriseTask({
        websiteURL: "https://example.com",
        websiteKey: "site-key",
        proxyType: "http",
        proxyAddress: "1.2.3.4",
        proxyPort: 8080,
      }),
      { softId: "override-soft", callbackUrl: "https://example.com/callback" },
    );

    expect(taskId).toBe(42);
  });

  it("omits softId when the caller sets it to an empty string", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.softId).toBeUndefined();
      return [200, { errorId: 0, taskId: 7 }];
    });

    const taskId = await client.createTask(
      recaptchaV2Task({ websiteURL: "https://example.com", websiteKey: "site-key" }),
      { softId: "" },
    );
    expect(taskId).toBe(7);
  });

  it("builds documented task payloads", () => {
    expect(
      recaptchaV3ProxylessTask({
        websiteURL: "https://example.com",
        websiteKey: "site-key",
        pageAction: "login",
      }).type,
    ).toBe("RecaptchaV3TaskProxyless");

    expect(
      recaptchaV2HsEnterpriseTask({
        websiteURL: "https://example.com",
        websiteKey: "site-key",
      }).type,
    ).toBe("ReCaptchaV2HSEnterpriseTaskProxyLess");

    const turnstile = turnstileProxylessTask({
      websiteURL: "https://example.com",
      websiteKey: "0x4AAAAAAA",
      pagedata: "challenge",
    });
    expect(turnstile.type).toBe("TurnstileTaskProxyless");
    expect(turnstile.pagedata).toBe("challenge");

    expect(
      hCaptchaTask({
        websiteURL: "https://example.com",
        websiteKey: "site-key",
        proxyAddress: "1.2.3.4",
        proxyType: "http",
        proxyPort: 8080,
      }).type,
    ).toBe("HCaptchaTask");

    expect(
      funCaptchaTask({
        websitePublicKey: "public-key",
        websiteURL: "https://example.com",
      }).type,
    ).toBe("FunCaptchaTaskProxyless");
  });

  it("gets task result", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/getTaskResult").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.taskId).toBe(1781234567890);
      expect(body.softId).toBeUndefined();

      return [
        200,
        {
          errorId: 0,
          status: "ready",
          solution: { gRecaptchaResponse: "token_value" },
        },
      ];
    });

    const result = await client.getTaskResult<{ gRecaptchaResponse: string }>(1781234567890);
    expect(result.status).toBe("ready");
    expect(result.solution?.gRecaptchaResponse).toBe("token_value");
  });

  it("returns processing while the task is still running", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/getTaskResult").reply(200, {
      errorId: 0,
      status: "processing",
    });

    const result = await client.getTaskResult(1781234567890);
    expect(result.status).toBe("processing");
    expect(result.solution).toBeUndefined();
  });

  it("waitForResult polls until ready", async () => {
    const client = new NextCaptcha("test_key");

    let calls = 0;
    mock.onPost("https://api.nextcaptcha.com/getTaskResult").reply(() => {
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

    const solution = await client.waitForResult<{ token: string }>(1781234567890, {
      intervalMs: 10,
      timeoutMs: 1000,
    });

    expect(solution.token).toBe("token_poll_done");
    expect(calls).toBe(2);
  });

  it("solve creates a task and returns the solution", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.softId).toBe(DEFAULT_SOFT_ID);
      expect(body.task.type).toBe("TurnstileTaskProxyless");
      return [200, { errorId: 0, taskId: 99 }];
    });
    mock.onPost("https://api.nextcaptcha.com/getTaskResult").reply(200, {
      errorId: 0,
      status: "ready",
      solution: { token: "turnstile-token" },
    });

    const solution = await client.solve<{ token: string }>(
      turnstileProxylessTask({
        websiteURL: "https://example.com",
        websiteKey: "0x4AAAAAAA",
      }),
      { intervalMs: 10, timeoutMs: 1000 },
    );

    expect(solution.token).toBe("turnstile-token");
  });

  it("parses a getToken success body and sends softId", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api-v2.nextcaptcha.com/getToken").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.softId).toBe(DEFAULT_SOFT_ID);
      expect(body.task.type).toBe("RecaptchaV2TaskProxyless");
      return [200, "0|03AFcWeA7CFb"];
    });

    const token = await client.getToken(
      recaptchaV2Task({ websiteURL: "https://example.com", websiteKey: "site-key" }),
    );
    expect(token).toBe("03AFcWeA7CFb");
  });

  it("throws when getToken returns a failure body", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api-v2.nextcaptcha.com/getToken").reply(
      200,
      "1|The CAPTCHA challenge failed to be resolved.",
    );

    await expect(
      client.getToken(recaptchaV2Task({ websiteURL: "https://example.com", websiteKey: "k" })),
    ).rejects.toThrow("failed to be resolved");
  });

  it("handles an invalid client key", async () => {
    const client = new NextCaptcha("bad_key");

    mock.onPost("https://api.nextcaptcha.com/getBalance").reply(200, {
      errorId: 1,
      errorCode: "ERROR_KEY_DOES_NOT_EXIST",
      errorDescription: "Your API key is incorrect",
    });

    try {
      await client.getBalance();
      fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(NextCaptchaError);
      const apiErr = err as NextCaptchaError;
      expect(apiErr.errorId).toBe(1);
      expect(apiErr.errorCode).toBe("ERROR_KEY_DOES_NOT_EXIST");
      expect(apiErr.message).toContain("API key");
    }
  });

  it("handles zero balance on createTask", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/createTask").reply(200, {
      errorId: 10,
      errorCode: "ERROR_ZERO_BALANCE",
      errorDescription: "Your account balance is zero",
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
      errorId: 10,
    });
  });

  it("uses the local catalog when errorDescription is missing", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/createTask").reply(200, {
      errorId: 10,
      errorCode: "ERROR_ZERO_BALANCE",
    });

    await expect(
      client.createTask({ type: "RecaptchaV2TaskProxyless", websiteURL: "https://example.com", websiteKey: "k" }),
    ).rejects.toThrow("account balance is zero");
  });

  it("handles HTTP 500 network failure", async () => {
    const client = new NextCaptcha("test_key");

    mock.onPost("https://api.nextcaptcha.com/getBalance").reply(500, {
      errorDescription: "Server Error",
    });

    await expect(client.getBalance()).rejects.toThrow(NextCaptchaError);
  });
});
