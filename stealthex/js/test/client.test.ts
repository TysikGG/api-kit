import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { StealthEX, StealthEXError } from "../src/index.js";

describe("StealthEX client", () => {
  let mock: MockAdapter;
  let client: StealthEX;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new StealthEX({ apiKey: "test-stealthex-key" });
  });

  afterEach(() => {
    mock.restore();
  });

  test("sends Authorization header and api_key query param", async () => {
    let capturedHeaders: any;
    let capturedParams: any;
    mock.onGet("/api/v2/currency").reply((config) => {
      capturedHeaders = config.headers;
      capturedParams = config.params;
      return [200, [{ symbol: "btc", name: "Bitcoin" }]];
    });

    const res = await client.getCurrencies();
    expect(res).toHaveLength(1);
    expect(capturedHeaders.Authorization).toBe("Bearer test-stealthex-key");
    expect(capturedParams.api_key).toBe("test-stealthex-key");
  });

  test("getCurrency fetches a single currency", async () => {
    mock.onGet("/api/v2/currency/btc").reply(200, {
      symbol: "btc",
      name: "Bitcoin",
    });

    const btc = await client.getCurrency("btc");
    expect(btc.name).toBe("Bitcoin");
  });

  test("getPairs fetches pairs list", async () => {
    mock.onGet("/api/v2/pairs/btc").reply(200, ["eth", "usdt", "sol"]);

    const pairs = await client.getPairs("btc");
    expect(pairs).toEqual(["eth", "usdt", "sol"]);
  });

  test("getRange and getMinAmount query limits", async () => {
    mock.onGet("/api/v2/range/btc/eth").reply(200, {
      min_amount: "0.001",
      max_amount: "10.0",
    });
    mock.onGet("/api/v2/min/btc/eth").reply(200, {
      min_amount: "0.001",
    });

    const range = await client.getRange("btc", "eth");
    expect(range.min_amount).toBe("0.001");

    const min = await client.getMinAmount("btc", "eth");
    expect(min.min_amount).toBe("0.001");
  });

  test("getEstimate queries rate for amount", async () => {
    mock.onGet("/api/v2/estimate/btc/eth").reply(200, {
      estimated_amount: "3.45",
    });

    const est = await client.getEstimate("btc", "eth", "0.1");
    expect(est.estimated_amount).toBe("3.45");
  });

  test("createExchange posts order parameters", async () => {
    let capturedBody: any;
    mock.onPost("/api/v2/exchange").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [
        200,
        {
          id: "stealth_100",
          status: "waiting",
          currency_from: "btc",
          currency_to: "eth",
          amount_from: "0.1",
          amount_to: "3.45",
          address_from: "1DepositBtcAddress",
          address_to: "0xReceiveEthAddress",
        },
      ];
    });

    const order = await client.createExchange({
      currencyFrom: "btc",
      currencyTo: "eth",
      amountFrom: "0.1",
      addressTo: "0xReceiveEthAddress",
    });

    expect(order.id).toBe("stealth_100");
    expect(capturedBody.currency_from).toBe("btc");
    expect(capturedBody.address_to).toBe("0xReceiveEthAddress");
  });

  test("getExchange and getExchanges query exchange history", async () => {
    mock.onGet("/api/v2/exchange/stealth_100").reply(200, {
      id: "stealth_100",
      status: "finished",
    });
    mock.onGet("/api/v2/exchanges/").reply(200, [
      { id: "stealth_100", status: "finished" },
    ]);

    const order = await client.getExchange("stealth_100");
    expect(order.status).toBe("finished");

    const list = await client.getExchanges(5);
    expect(list).toHaveLength(1);
  });

  test("throws StealthEXError on HTTP error", async () => {
    mock.onGet("/api/v2/currency").reply(401, {
      message: "API key is invalid",
    });

    await expect(client.getCurrencies()).rejects.toThrow(StealthEXError);
  });
});
