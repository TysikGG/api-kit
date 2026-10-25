import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { APP_ID, Peak, PeakError } from "../src/index.js";

describe("Peak client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("throws when API key is missing", () => {
    expect(() => new Peak("")).toThrow(PeakError);
    expect(() => new Peak({ apiKey: "  " })).toThrow("API key is required");
  });

  it("retrieves pay-per-solve balance", async () => {
    const client = new Peak("pk_test_123");

    mock.onGet("https://api.peak.fo/balance").reply(200, {
      success: true,
      data: {
        type: "pay_per_solve",
        balance: 15.75,
      },
    });

    const balance = await client.getBalance();
    expect(balance.type).toBe("pay_per_solve");
    if (balance.type === "pay_per_solve") {
      expect(balance.balance).toBe(15.75);
    }
  });

  it("retrieves package balance", async () => {
    const client = new Peak("pk_test_123");

    mock.onGet("https://api.peak.fo/balance").reply(200, {
      success: true,
      data: {
        type: "package",
        package: "Pro 10k",
        expires_at: "2026-12-31T00:00:00Z",
        days_remaining: 45,
      },
    });

    const balance = await client.getBalance();
    expect(balance.type).toBe("package");
    if (balance.type === "package") {
      expect(balance.package).toBe("Pro 10k");
      expect(balance.days_remaining).toBe(45);
    }
  });

  it("handles balance failure response", async () => {
    const client = new Peak("pk_test_123");

    mock.onGet("https://api.peak.fo/balance").reply(200, {
      success: false,
      error: "Account suspended",
    });

    await expect(client.getBalance()).rejects.toThrow(PeakError);
  });

  it("solves turnstile proxyless and embeds appId", async () => {
    const client = new Peak("pk_test_123");

    mock.onPost("https://api.peak.fo/solve").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.appId).toBe(APP_ID);
      expect(body.task_type).toBe("TurnstileTaskProxyLess");
      expect(body.url).toBe("https://example.com/");
      expect(body.sitekey).toBe("0x4AAAAAAA");
      expect(body.proxy).toBeUndefined();

      return [
        200,
        {
          success: true,
          data: {
            token: "0.AgAAABBqzz...",
          },
        },
      ];
    });

    const res = await client.solveTurnstile({
      url: "https://example.com/",
      sitekey: "0x4AAAAAAA",
    });

    expect(res.token).toBe("0.AgAAABBqzz...");
  });

  it("solves turnstile with proxy and embeds appId", async () => {
    const client = new Peak("pk_test_123");

    mock.onPost("https://api.peak.fo/solve").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.appId).toBe(APP_ID);
      expect(body.task_type).toBe("turnstiletask");
      expect(body.proxy).toBe("http://user:pass@1.2.3.4:8080");
      expect(body.action).toBe("login");
      expect(body.cdata).toBe("test_cdata");

      return [
        200,
        {
          success: true,
          data: {
            token: "0.AgAAABBqzz_proxied...",
          },
        },
      ];
    });

    const res = await client.solveTurnstile({
      url: "https://example.com/",
      sitekey: "0x4AAAAAAA",
      proxy: "http://user:pass@1.2.3.4:8080",
      action: "login",
      cdata: "test_cdata",
    });

    expect(res.token).toBe("0.AgAAABBqzz_proxied...");
  });

  it("solves cloudflare 5-second challenge and embeds appId", async () => {
    const client = new Peak("pk_test_123");

    mock.onPost("https://api.peak.fo/solve").reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.appId).toBe(APP_ID);
      expect(body.task_type).toBe("cloudflare5stask");
      expect(body.proxy).toBe("http://user:pass@1.2.3.4:8080");
      expect(body.user_agent).toBe("Mozilla/5.0 Windows");

      return [
        200,
        {
          success: true,
          data: {
            cookies: { cf_clearance: "clearance_val" },
            headers: { "user-agent": "Mozilla/5.0 Windows" },
            attributes: { md: "md_val", r: "r_val" },
            cf_rt: "challenge_tok",
          },
        },
      ];
    });

    const res = await client.solveCloudflare5s({
      url: "https://example.com/",
      proxy: "http://user:pass@1.2.3.4:8080",
      userAgent: "Mozilla/5.0 Windows",
    });

    expect(res.cookies.cf_clearance).toBe("clearance_val");
    expect(res.cf_rt).toBe("challenge_tok");
  });

  it("handles solve error response with success: false", async () => {
    const client = new Peak("pk_test_123");

    mock.onPost("https://api.peak.fo/solve").reply(200, {
      success: false,
      error: "Sitekey invalid or domain mismatch",
    });

    await expect(
      client.solveTurnstile({
        url: "https://example.com/",
        sitekey: "bad_key",
      }),
    ).rejects.toThrow("Sitekey invalid or domain mismatch");
  });

  it("handles HTTP 401 Unauthorized", async () => {
    const client = new Peak("pk_bad_key");

    mock.onGet("https://api.peak.fo/balance").reply(401, {
      success: false,
      error: "API key invalid",
    });

    try {
      await client.getBalance();
      fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PeakError);
      const peakErr = err as PeakError;
      expect(peakErr.status).toBe(401);
      expect(peakErr.message).toBe("API key invalid");
    }
  });

  it("handles network failure", async () => {
    const client = new Peak("pk_test_123");

    mock.onGet("https://api.peak.fo/balance").networkError();

    await expect(client.getBalance()).rejects.toThrow(PeakError);
  });
});
