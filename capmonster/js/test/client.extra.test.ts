import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import {
  CapMonster,
  CapMonsterError,
  TimeoutError,
  ZeroBalanceError,
  effectiveClientKey,
  imageToTextTask,
  recaptchaV2Task,
} from "../src/index.js";

describe("CapMonster extra API", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("applies client-key suffixes only when requested", () => {
    expect(effectiveClientKey("API_KEY", {})).toBe("API_KEY");
    expect(
      effectiveClientKey("API_KEY", {
        moduleName: " solvemedia ",
        recognizingThreshold: 70,
        nocache: true,
      }),
    ).toBe("API_KEY__solvemedia__recognizingthreshold_70__nocache");
  });

  it("sends the suffixed key and a non-numeric softId", async () => {
    const client = new CapMonster({
      clientKey: "API_KEY",
      moduleName: "yandex",
      recognizingThreshold: 80,
      nocache: true,
      softId: " partner ",
      baseUrl: "https://api.example.test/",
    });

    mock.onPost("https://api.example.test/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("API_KEY__yandex__recognizingthreshold_80__nocache");
      expect(body.softId).toBe("partner");
      return [200, { errorId: 0, taskId: "99" }];
    });

    await expect(
      client.createTask(imageToTextTask({ body: "abc" }), { softId: " partner " }),
    ).resolves.toBe(99);
  });

  it("omits softId when it is 0 or blank", async () => {
    const client = new CapMonster({ clientKey: "API_KEY", softId: 0 });
    mock.onPost("https://api.capmonster.cloud/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.softId).toBeUndefined();
      return [200, { errorId: 0, taskId: 5 }];
    });
    await expect(client.createTask({ type: "ImageToTextTask", body: "abc" }, { softId: "  " })).resolves.toBe(
      5,
    );
  });

  it("fetches the current user agent", async () => {
    const client = new CapMonster("API_KEY");
    const ua = "Mozilla/5.0 Chrome/155.0.0.0";
    mock.onGet("https://capmonster.cloud/api/useragent/actual").reply(200, ua);

    await expect(client.getUserAgent()).resolves.toBe(ua);
  });

  it("rejects an empty user-agent body", async () => {
    const client = new CapMonster({
      clientKey: "API_KEY",
      userAgentUrl: "https://ua.example.test/actual",
    });
    mock.onGet("https://ua.example.test/actual").reply(200, "  ");
    await expect(client.getUserAgent()).rejects.toMatchObject({ errorCode: "EMPTY_USER_AGENT" });
  });

  it("reports incorrect image, token, and recaptcha solutions", async () => {
    const client = new CapMonster("API_KEY");
    const seen: string[] = [];
    mock.onPost(/reportIncorrect/).reply((config) => {
      seen.push(config.url ?? "");
      const body = JSON.parse(config.data);
      expect(body.clientKey).toBe("API_KEY");
      expect(body.taskId).toBe(11);
      return [200, { errorId: 0, status: "success" }];
    });

    await expect(client.reportIncorrectImageCaptcha("11")).resolves.toEqual({ status: "success" });
    await expect(client.reportIncorrectToken(11)).resolves.toEqual({ status: "success" });
    await expect(client.reportIncorrectRecaptcha(11)).resolves.toEqual({ status: "success" });
    expect(seen.map((url) => url.split("/").pop())).toEqual([
      "reportIncorrectImageCaptcha",
      "reportIncorrectTokenCaptcha",
      "reportIncorrectRecaptcha",
    ]);
  });

  it("rejects a report that is not accepted", async () => {
    const client = new CapMonster("API_KEY");
    mock.onPost("https://api.capmonster.cloud/reportIncorrectImageCaptcha").reply(200, {
      errorId: 0,
      status: "failed",
    });
    await expect(client.reportIncorrectImage(7)).rejects.toThrow(/not accepted/);
  });

  it("solves and returns the task id", async () => {
    const client = new CapMonster("API_KEY");
    mock.onPost("https://api.capmonster.cloud/createTask").reply(200, { errorId: 0, taskId: 3 });
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(200, {
      errorId: 0,
      status: "ready",
      solution: { text: "ok" },
    });

    const solved = await client.solveDetailed<{ text: string }>(imageToTextTask({ body: "abc" }), {
      intervalMs: 1,
      timeoutMs: 1000,
    });
    expect(solved).toEqual({ taskId: 3, solution: { text: "ok" } });

    mock.onPost("https://api.capmonster.cloud/createTask").reply(200, { errorId: 0, taskId: 4 });
    await expect(client.solve(imageToTextTask({ body: "abc" }), { timeoutMs: 1000 })).resolves.toEqual({
      text: "ok",
    });
  });

  it("polls through a not-ready error and a ready payload without a solution", async () => {
    const client = new CapMonster("API_KEY");
    const statuses: string[] = [];
    let calls = 0;
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(() => {
      calls += 1;
      if (calls === 1) {
        return [200, { errorId: 1, errorCode: "CAPTCHA_NOT_READY" }];
      }
      if (calls === 2) {
        return [200, { errorId: 0, status: "ready" }];
      }
      return [200, { errorId: 0, status: "ready", solution: { token: "t" } }];
    });

    const solution = await client.waitForResult<{ token: string }>(8, {
      intervalMs: 1,
      timeoutMs: 2000,
      initialDelayMs: 1,
      onPoll: (update) => statuses.push(update.status),
    });
    expect(solution.token).toBe("t");
    expect(statuses).toEqual(["processing", "ready", "ready"]);
  });

  it("stops after maxAttempts", async () => {
    const client = new CapMonster("API_KEY");
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(200, {
      errorId: 0,
      status: "processing",
    });
    await expect(client.waitForResult(8, { intervalMs: 1, timeoutMs: 10_000, maxAttempts: 2 })).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });

  it("times out and can be aborted", async () => {
    const client = new CapMonster("API_KEY");
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(200, {
      errorId: 0,
      status: "processing",
    });
    await expect(client.waitForResult(8, { intervalMs: 30, timeoutMs: 5 })).rejects.toMatchObject({
      errorCode: "TIMEOUT",
    });

    const controller = new AbortController();
    controller.abort();
    await expect(client.waitForResult(8, { signal: controller.signal, timeoutMs: 1000 })).rejects.toMatchObject({
      errorCode: "ABORTED",
    });
  });

  it("aborts while waiting between polls", async () => {
    const client = new CapMonster("API_KEY");
    const controller = new AbortController();
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(() => {
      controller.abort();
      return [200, { errorId: 0, status: "processing" }];
    });
    await expect(
      client.waitForResult(8, { intervalMs: 50, timeoutMs: 2000, signal: controller.signal }),
    ).rejects.toMatchObject({ errorCode: "ABORTED" });
  });

  it("rethrows task errors other than CAPTCHA_NOT_READY", async () => {
    const client = new CapMonster({ clientKey: "API_KEY", softId: 42 });
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(200, {
      errorId: 1,
      errorCode: "ERROR_CAPTCHA_UNSOLVABLE",
    });
    await expect(client.getTaskResult(8)).rejects.toMatchObject({
      errorCode: "ERROR_CAPTCHA_UNSOLVABLE",
    });

    mock.onPost("https://api.capmonster.cloud/createTask").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.softId).toBe(42);
      return [200, { errorId: 0, taskId: 1 }];
    });
    await expect(client.createTask({ type: "ImageToTextTask", body: "abc" })).resolves.toBe(1);
  });

  it("aborts an initial delay and a delay that is already in progress", async () => {
    const client = new CapMonster("API_KEY");
    const already = new AbortController();
    already.abort();
    await expect(
      client.waitForResult(8, { signal: already.signal, initialDelayMs: 20, timeoutMs: 1000 }),
    ).rejects.toMatchObject({ errorCode: "ABORTED" });

    const later = new AbortController();
    mock.onPost("https://api.capmonster.cloud/getTaskResult").reply(() => {
      setTimeout(() => later.abort(), 15);
      return [200, { errorId: 0, status: "processing" }];
    });
    await expect(
      client.waitForResult(8, { signal: later.signal, intervalMs: 200, timeoutMs: 2000 }),
    ).rejects.toMatchObject({ errorCode: "ABORTED" });
  });

  it("wraps a non-Error thrown by the HTTP client", async () => {
    const http = axios.create({ baseURL: "https://api.capmonster.cloud" });
    http.post = () => Promise.reject("boom");
    const client = new CapMonster({ clientKey: "API_KEY", axios: http });
    await expect(client.getBalance()).rejects.toThrow("Unknown error");
  });

  it("rejects invalid task ids and a missing taskId", async () => {
    const client = new CapMonster("API_KEY");
    await expect(client.getTaskResult(0)).rejects.toMatchObject({ errorCode: "WRONG_CAPTCHA_ID" });
    await expect(client.getTaskResult("nope")).rejects.toMatchObject({ errorCode: "WRONG_CAPTCHA_ID" });
    await expect(client.reportIncorrectTokenCaptcha(1.5)).rejects.toBeInstanceOf(CapMonsterError);

    mock.onPost("https://api.capmonster.cloud/createTask").reply(200, { errorId: 0 });
    await expect(client.createTask(recaptchaV2Task({ websiteURL: "https://e.com", websiteKey: "k" }))).rejects.toThrow(
      /taskId/,
    );
  });

  it("retries a transient failure and then succeeds", async () => {
    const client = new CapMonster({ clientKey: "API_KEY", retries: 1, retryDelayMs: 0 });
    let calls = 0;
    mock.onPost("https://api.capmonster.cloud/getBalance").reply(() => {
      calls += 1;
      if (calls === 1) {
        return [200, { errorId: 1, errorCode: "ERROR_SERVICE_NOT_AVAILABLE" }];
      }
      return [200, { errorId: 0, balance: 1 }];
    });
    await expect(client.getBalance()).resolves.toEqual({ balance: 1 });
    expect(calls).toBe(2);
  });

  it("does not retry a zero balance and gives up after the last attempt", async () => {
    const client = new CapMonster({ clientKey: "API_KEY", retries: 1, retryDelayMs: 0 });
    mock.onPost("https://api.capmonster.cloud/createTask").reply(200, {
      errorId: 1,
      errorCode: "ERROR_ZERO_BALANCE",
    });
    await expect(
      client.createTask(recaptchaV2Task({ websiteURL: "https://e.com", websiteKey: "k" })),
    ).rejects.toBeInstanceOf(ZeroBalanceError);

    mock.onPost("https://api.capmonster.cloud/getBalance").reply(503, "unavailable");
    await expect(client.getBalance()).rejects.toBeInstanceOf(CapMonsterError);
  });

  it("wraps a network failure and a non-JSON body", async () => {
    const client = new CapMonster("API_KEY");
    mock.onPost("https://api.capmonster.cloud/getBalance").networkError();
    await expect(client.getBalance()).rejects.toBeInstanceOf(CapMonsterError);

    mock.reset();
    mock.onPost("https://api.capmonster.cloud/getBalance").reply(200, "not-json");
    await expect(client.getBalance()).rejects.toThrow(/non-JSON/);
  });

  it("uses the catalog for an undocumented numeric error and defaults a missing balance", async () => {
    const client = new CapMonster("API_KEY");
    let calls = 0;
    mock.onPost("https://api.capmonster.cloud/getBalance").reply(() => {
      calls += 1;
      if (calls === 1) return [200, { errorId: 4 }];
      return [200, { errorId: 0 }];
    });
    await expect(client.getBalance()).rejects.toThrow("API error #4");
    await expect(client.getBalance()).resolves.toEqual({ balance: 0 });
  });

  it("uses a caller-supplied axios instance", async () => {
    const http = axios.create({ baseURL: "https://custom.example.test" });
    const local = new MockAdapter(http);
    local.onPost("/getBalance").reply(200, { errorId: 0, balance: 9 });
    const client = new CapMonster({ clientKey: "API_KEY", axios: http });
    await expect(client.getBalance()).resolves.toEqual({ balance: 9 });
    local.restore();
  });

  it("describes an HTTP error that includes an API body", async () => {
    const client = new CapMonster("API_KEY");
    mock.onGet("https://capmonster.cloud/api/useragent/actual").reply(500, {
      errorId: 1,
      errorCode: "ERROR_SERVICE_NOT_AVAILABLE",
    });
    await expect(client.getUserAgent()).rejects.toThrow(/temporarily unavailable/i);
  });
});
