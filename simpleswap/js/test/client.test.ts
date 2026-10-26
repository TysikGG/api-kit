import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { SimpleSwap, SimpleSwapError } from "../src/index.js";

describe("SimpleSwap client", () => {
  let mock: MockAdapter;
  let client: SimpleSwap;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new SimpleSwap({ apiKey: "test-simpleswap-key" });
  });

  afterEach(() => {
    mock.restore();
  });

  test("sends x-api-key header on requests", async () => {
    let capturedHeaders: any;
    mock.onGet("/v3/currencies").reply((config) => {
      capturedHeaders = config.headers;
      return [
        200,
        {
          traceId: "trace_1",
          result: [{ ticker: "btc", network: "btc", name: "Bitcoin" }],
        },
      ];
    });

    const res = await client.getCurrencies();
    expect(res).toHaveLength(1);
    expect(capturedHeaders["x-api-key"]).toBe("test-simpleswap-key");
  });

  test("getCurrency fetches a single currency by ticker and network", async () => {
    mock.onGet("/v3/currencies/btc/btc").reply(200, {
      traceId: "trace_2",
      result: { ticker: "btc", network: "btc", name: "Bitcoin" },
    });

    const btc = await client.getCurrency("btc", "btc");
    expect(btc.name).toBe("Bitcoin");
  });

  test("getEstimate queries rate and passes customFee", async () => {
    let capturedParams: any;
    mock.onGet("/v3/estimates").reply((config) => {
      capturedParams = config.params;
      return [
        200,
        {
          traceId: "trace_3",
          result: { estimatedAmount: "3.45", rateId: null, validUntil: null },
        },
      ];
    });

    const estimate = await client.getEstimate({
      tickerFrom: "btc",
      tickerTo: "eth",
      networkFrom: "btc",
      networkTo: "eth",
      amount: "0.1",
      customFee: 0.8,
    });

    expect(estimate.estimatedAmount).toBe("3.45");
    expect(capturedParams.customFee).toBe("0.8");
    expect(capturedParams.amount).toBe("0.1");
  });

  test("getRanges returns deposit bounds", async () => {
    mock.onGet("/v3/ranges").reply(200, {
      traceId: "trace_4",
      result: { min: "0.001", max: "10.0" },
    });

    const ranges = await client.getRanges({
      tickerFrom: "btc",
      tickerTo: "eth",
    });

    expect(ranges.min).toBe("0.001");
    expect(ranges.max).toBe("10.0");
  });

  test("checkExchange returns canCreate boolean", async () => {
    mock.onGet("/v3/exchanges/check").reply(200, {
      traceId: "trace_5",
      result: { canCreate: true },
    });

    const check = await client.checkExchange({
      tickerFrom: "btc",
      tickerTo: "eth",
      amount: "0.1",
    });

    expect(check.canCreate).toBe(true);
  });

  test("createExchange posts order payload with customFee", async () => {
    let capturedBody: any;
    mock.onPost("/v3/exchanges").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [
        200,
        {
          traceId: "trace_6",
          result: {
            id: "ex_100",
            status: "waiting",
            tickerFrom: "btc",
            tickerTo: "eth",
            amountFrom: "0.1",
            amountTo: "3.45",
            addressFrom: "1BtcDepositAddress",
            addressTo: "0xEthReceiveAddress",
          },
        },
      ];
    });

    const order = await client.createExchange({
      tickerFrom: "btc",
      tickerTo: "eth",
      amount: "0.1",
      addressTo: "0xEthReceiveAddress",
      customFee: 0.5,
    });

    expect(order.id).toBe("ex_100");
    expect(order.addressFrom).toBe("1BtcDepositAddress");
    expect(capturedBody.customFee).toBe(0.5);
  });

  test("getExchange and getExchanges query exchange history", async () => {
    mock.onGet("/v3/exchanges/ex_100").reply(200, {
      traceId: "trace_7",
      result: { id: "ex_100", status: "finished" },
    });

    mock.onGet("/v3/exchanges").reply(200, {
      traceId: "trace_8",
      result: [{ id: "ex_100", status: "finished" }],
    });

    const single = await client.getExchange("ex_100");
    expect(single.status).toBe("finished");

    const list = await client.getExchanges({ limit: 10 });
    expect(list).toHaveLength(1);
  });

  test("throws SimpleSwapError when error: true is returned", async () => {
    mock.onGet("/v3/estimates").reply(200, {
      traceId: "trace_err",
      error: true,
      message: "Pair is disabled",
    });

    await expect(
      client.getEstimate({ tickerFrom: "btc", tickerTo: "eth", amount: 0.1 })
    ).rejects.toThrow(SimpleSwapError);
  });

  test("throws SimpleSwapError on HTTP 401 unauthorized", async () => {
    mock.onGet("/v3/currencies").reply(401, {
      traceId: "trace_unauth",
      message: "API key is invalid",
    });

    await expect(client.getCurrencies()).rejects.toThrow(SimpleSwapError);
  });
});
