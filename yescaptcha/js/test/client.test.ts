import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SOFT_ID, YesCaptcha, YesCaptchaError } from "../src/index.js";

describe("YesCaptcha client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("throws when clientKey is missing", () => {
    expect(() => new YesCaptcha("")).toThrow(YesCaptchaError);
    expect(() => new YesCaptcha({ clientKey: "  " })).toThrow("Client key is required");
  });

  it("fetches account balance", async () => {
    const client = new YesCaptcha("test_key");

    mock.onPost("https://api.yescaptcha.com/getBalance").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");

      return [
        200,
        {
          errorId: 0,
          balance: 1000,
          softBalance: 50,
          inviteBalance: 20,
          inviteBy: 12345,
        },
      ];
    });

    const balance = await client.getBalance();
    expect(balance.balance).toBe(1000);
    expect(balance.softBalance).toBe(50);
    expect(balance.inviteBalance).toBe(20);
    expect(balance.inviteBy).toBe(12345);
  });

  it("creates a task and embeds softID", async () => {
    const client = new YesCaptcha("test_key");

    mock.onPost("https://api.yescaptcha.com/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.softID).toBe(SOFT_ID);
      expect(body.task.type).toBe("TurnstileTaskProxyless");
      expect(body.task.websiteURL).toBe("https://example.com");

      return [
        200,
        {
          errorId: 0,
          taskId: "task_abc_123",
        },
      ];
    });

    const taskId = await client.createTask({
      type: "TurnstileTaskProxyless",
      websiteURL: "https://example.com",
    });

    expect(taskId).toBe("task_abc_123");
  });

  it("gets task result", async () => {
    const client = new YesCaptcha("test_key");

    mock.onPost("https://api.yescaptcha.com/getTaskResult").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("test_key");
      expect(body.taskId).toBe("task_abc_123");

      return [
        200,
        {
          errorId: 0,
          status: "ready",
          solution: {
            token: "0.solution_token",
          },
        },
      ];
    });

    const result = await client.getTaskResult<{ token: string }>("task_abc_123");
    expect(result.status).toBe("ready");
    expect(result.solution?.token).toBe("0.solution_token");
  });

  it("waitForResult polls until ready", async () => {
    const client = new YesCaptcha("test_key");

    let calls = 0;
    mock.onPost("https://api.yescaptcha.com/getTaskResult").reply(() => {
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

    const solution = await client.waitForResult<{ token: string }>("task_123", {
      intervalMs: 10,
      timeoutMs: 1000,
    });

    expect(solution.token).toBe("token_poll_done");
    expect(calls).toBe(2);
  });

  it("handles API error with errorId > 0", async () => {
    const client = new YesCaptcha("bad_key");

    mock.onPost("https://api.yescaptcha.com/getBalance").reply(200, {
      errorId: 1,
      errorCode: "ERROR_KEY_DOES_NOT_EXIST",
      errorDescription: "Account key does not exist",
    });

    try {
      await client.getBalance();
      fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(YesCaptchaError);
      const yErr = err as YesCaptchaError;
      expect(yErr.errorId).toBe(1);
      expect(yErr.errorCode).toBe("ERROR_KEY_DOES_NOT_EXIST");
      expect(yErr.message).toBe("Account key does not exist");
    }
  });

  it("handles HTTP 500 network failure", async () => {
    const client = new YesCaptcha("test_key");

    mock.onPost("https://api.yescaptcha.com/getBalance").reply(500, {
      errorDescription: "Server Error",
    });

    await expect(client.getBalance()).rejects.toThrow(YesCaptchaError);
  });
});
