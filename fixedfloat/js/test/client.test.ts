import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as crypto from "node:crypto";
import { DEFAULT_REFCODE, FixedFloat, FixedFloatError } from "../src/index.js";

describe("FixedFloat Client", () => {
  let mock: MockAdapter;
  let client: FixedFloat;
  const apiKey = "test-api-key";
  const apiSecret = "test-api-secret";

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new FixedFloat({ apiKey, apiSecret, retries: 0 });
  });

  afterEach(() => {
    mock.restore();
  });

  test("has expected internal constant", () => {
    expect(DEFAULT_REFCODE).toBe("gfc1h2fb");
  });

  test("sends X-API-KEY and valid HMAC-SHA256 X-API-SIGN headers", async () => {
    let capturedHeaders: Record<string, string> = {};
    let capturedData: string = "";

    mock.onPost("https://ff.io/api/v2/ccies").reply((config) => {
      capturedHeaders = config.headers as Record<string, string>;
      capturedData = config.data;
      return [200, { code: 0, msg: "OK", data: [] }];
    });

    await client.getCurrencies();

    expect(capturedHeaders["X-API-KEY"]).toBe(apiKey);
    const expectedSign = crypto
      .createHmac("sha256", apiSecret)
      .update(capturedData)
      .digest("hex");
    expect(capturedHeaders["X-API-SIGN"]).toBe(expectedSign);
  });

  test("getCurrencies returns list of currencies", async () => {
    const mockCurrencies = [
      {
        code: "BTC",
        coin: "BTC",
        network: "BTC",
        name: "Bitcoin",
        recv: 1,
        send: 1,
        tag: null,
        logo: "https://ff.io/logo/btc.svg",
        color: "#f7931a",
        priority: 1,
      },
    ];

    mock.onPost("https://ff.io/api/v2/ccies").reply(200, {
      code: 0,
      msg: "OK",
      data: mockCurrencies,
    });

    const res = await client.getCurrencies();
    expect(res).toEqual(mockCurrencies);
  });

  test("getPrice includes refcode and afftax in payload", async () => {
    let sentBody: Record<string, unknown> = {};

    const mockPrice = {
      from: {
        code: "BTC",
        network: "BTC",
        coin: "BTC",
        amount: "0.1",
        rate: "1",
        min: "0.001",
        max: "2",
      },
      to: {
        code: "ETH",
        network: "ETH",
        coin: "ETH",
        amount: "3.25",
        rate: "32.5",
        min: "0.02",
        max: "40",
      },
    };

    mock.onPost("https://ff.io/api/v2/price").reply((config) => {
      sentBody = JSON.parse(config.data);
      return [200, { code: 0, msg: "OK", data: mockPrice }];
    });

    const res = await client.getPrice({
      fromCcy: "BTC",
      toCcy: "ETH",
      amount: 0.1,
      direction: "from",
      type: "float",
      afftax: 0.5,
    });

    expect(res).toEqual(mockPrice);
    expect(sentBody.refcode).toBe("gfc1h2fb");
    expect(sentBody.afftax).toBe(0.5);
    expect(sentBody.fromCcy).toBe("BTC");
    expect(sentBody.toCcy).toBe("ETH");
  });

  test("createOrder includes refcode in payload and returns order details", async () => {
    let sentBody: Record<string, unknown> = {};

    const mockOrder = {
      id: "ORD12345",
      type: "float",
      status: "NEW",
      time: { reg: 1700000000 },
      from: { code: "BTC", network: "BTC", coin: "BTC", amount: "0.1" },
      to: {
        code: "ETH",
        network: "ETH",
        coin: "ETH",
        amount: "3.25",
        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      },
      token: "SEC_TOKEN_XYZ",
    };

    mock.onPost("https://ff.io/api/v2/create").reply((config) => {
      sentBody = JSON.parse(config.data);
      return [200, { code: 0, msg: "OK", data: mockOrder }];
    });

    const res = await client.createOrder({
      fromCcy: "BTC",
      toCcy: "ETH",
      amount: 0.1,
      direction: "from",
      type: "float",
      toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    });

    expect(res).toEqual(mockOrder);
    expect(sentBody.refcode).toBe("gfc1h2fb");
    expect(sentBody.toAddress).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
  });

  test("getOrder sends order id and token", async () => {
    let sentBody: Record<string, unknown> = {};

    const mockOrder = {
      id: "ORD12345",
      type: "float",
      status: "DONE",
      time: { reg: 1700000000, finish: 1700001000 },
      from: { code: "BTC", network: "BTC", coin: "BTC", amount: "0.1" },
      to: {
        code: "ETH",
        network: "ETH",
        coin: "ETH",
        amount: "3.25",
        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      },
      token: "SEC_TOKEN_XYZ",
    };

    mock.onPost("https://ff.io/api/v2/order").reply((config) => {
      sentBody = JSON.parse(config.data);
      return [200, { code: 0, msg: "OK", data: mockOrder }];
    });

    const res = await client.getOrder("ORD12345", "SEC_TOKEN_XYZ");
    expect(res).toEqual(mockOrder);
    expect(sentBody.id).toBe("ORD12345");
    expect(sentBody.token).toBe("SEC_TOKEN_XYZ");
  });

  test("setEmergency sends parameters", async () => {
    let sentBody: Record<string, unknown> = {};

    mock.onPost("https://ff.io/api/v2/emergency").reply((config) => {
      sentBody = JSON.parse(config.data);
      return [200, { code: 0, msg: "OK", data: true }];
    });

    const res = await client.setEmergency({
      id: "ORD12345",
      token: "SEC_TOKEN_XYZ",
      choice: "REFUND",
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    });

    expect(res).toBe(true);
    expect(sentBody.choice).toBe("REFUND");
    expect(sentBody.address).toBe("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");
  });

  test("setEmail sends email payload", async () => {
    let sentBody: Record<string, unknown> = {};

    mock.onPost("https://ff.io/api/v2/setEmail").reply((config) => {
      sentBody = JSON.parse(config.data);
      return [200, { code: 0, msg: "OK", data: true }];
    });

    const res = await client.setEmail("ORD12345", "SEC_TOKEN_XYZ", "test@example.com");
    expect(res).toBe(true);
    expect(sentBody.email).toBe("test@example.com");
  });

  test("getQr returns qr result", async () => {
    mock.onPost("https://ff.io/api/v2/qr").reply(200, {
      code: 0,
      msg: "OK",
      data: { src: "data:image/png;base64,iVBORw0KGgo..." },
    });

    const res = await client.getQr("ORD12345", "SEC_TOKEN_XYZ");
    expect(res.src).toContain("data:image/png");
  });

  test("throws FixedFloatError when API returns error code", async () => {
    mock.onPost("https://ff.io/api/v2/price").reply(200, {
      code: 101,
      msg: "Invalid amount or pair",
      data: null,
    });

    await expect(
      client.getPrice({
        fromCcy: "BTC",
        toCcy: "ETH",
        amount: 0.0000001,
        direction: "from",
        type: "float",
      }),
    ).rejects.toThrow(FixedFloatError);
  });

  test("handles HTTP 500 error cleanly", async () => {
    mock.onPost("https://ff.io/api/v2/ccies").reply(500, {
      code: 500,
      msg: "Internal server error",
    });

    await expect(client.getCurrencies()).rejects.toThrow(FixedFloatError);
  });
});
