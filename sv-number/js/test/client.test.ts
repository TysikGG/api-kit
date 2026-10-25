import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { REF_KEY, SvNumber, SvNumberError } from "../src/index.js";

describe("SvNumber client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("throws when apiKey is missing", () => {
    expect(() => new SvNumber("")).toThrow(SvNumberError);
    expect(() => new SvNumber({ apiKey: "  " })).toThrow("API key is required");
  });

  it("fetches balance formatted as decimal number", async () => {
    const client = new SvNumber("test_api_key");

    mock.onGet("https://sms-verification-number.com/stubs/handler_api").reply((config) => {
      expect(config.params.action).toBe("getBalance");
      expect(config.params.api_key).toBe("test_api_key");
      expect(config.params.ref_key).toBe(REF_KEY);
      return [200, "15.50"];
    });

    const balance = await client.getBalance();
    expect(balance).toBe(15.5);
  });

  it("fetches balance formatted with ACCESS_BALANCE prefix", async () => {
    const client = new SvNumber("test_api_key");

    mock.onGet("https://sms-verification-number.com/stubs/handler_api").reply(200, "ACCESS_BALANCE:20.75");

    const balance = await client.getBalance();
    expect(balance).toBe(20.75);
  });

  it("orders a number and embeds ref_key", async () => {
    const client = new SvNumber("test_api_key");

    mock.onGet("https://sms-verification-number.com/stubs/handler_api").reply((config) => {
      expect(config.params.action).toBe("getNumber");
      expect(config.params.ref_key).toBe(REF_KEY);
      expect(config.params.service).toBe("wa");
      expect(config.params.country).toBe("0");

      return [200, "ACCESS_NUMBER:12345:1234567890"];
    });

    const order = await client.getNumber({ service: "wa", country: 0 });
    expect(order.activationId).toBe("12345");
    expect(order.phoneNumber).toBe("1234567890");
  });

  it("queries status of activation", async () => {
    const client = new SvNumber("test_api_key");

    mock.onGet("https://sms-verification-number.com/stubs/handler_api").reply(200, "STATUS_OK:987654");

    const status = await client.getStatus("12345");
    expect(status.status).toBe("STATUS_OK");
    expect(status.code).toBe("987654");
  });

  it("polls waitForCode until SMS arrives", async () => {
    const client = new SvNumber("test_api_key");

    let count = 0;
    mock.onGet("https://sms-verification-number.com/stubs/handler_api").reply(() => {
      count += 1;
      if (count === 1) return [200, "STATUS_WAIT_CODE"];
      return [200, "STATUS_OK:554433"];
    });

    const res = await client.waitForCode("12345", {
      intervalMs: 10,
      timeoutMs: 1000,
    });

    expect(res.code).toBe("554433");
  });

  it("handles API error code", async () => {
    const client = new SvNumber("test_api_key");

    mock.onGet("https://sms-verification-number.com/stubs/handler_api").reply(200, "NO_NUMBERS");

    await expect(client.getNumber({ service: "tg" })).rejects.toThrow("NO_NUMBERS");
  });
});
