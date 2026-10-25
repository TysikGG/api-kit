import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { Swapzone, SwapzoneError } from "../src/index.js";

describe("Swapzone client", () => {
  let mock: MockAdapter;
  let client: Swapzone;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new Swapzone({ apiKey: "test-swapzone-key" });
  });

  afterEach(() => {
    mock.restore();
  });

  test("sends x-api-key header on requests", async () => {
    let capturedHeaders: any;
    mock.onGet("/v1/exchange/currencies").reply((config) => {
      capturedHeaders = config.headers;
      return [200, [{ name: "Bitcoin", ticker: "btc", network: "BTC" }]];
    });

    const res = await client.getCurrencies();
    expect(res).toHaveLength(1);
    expect(capturedHeaders["x-api-key"]).toBe("test-swapzone-key");
  });

  test("getRate returns rate offer with parameters", async () => {
    let capturedParams: any;
    mock.onGet("/v1/exchange/get-rate").reply((config) => {
      capturedParams = config.params;
      return [
        200,
        {
          adapter: "changenow",
          from: "btc",
          to: "eth",
          amountFrom: 0.1,
          amountTo: 1.5,
          quotaId: "quota_123",
        },
      ];
    });

    const rate = await client.getRate({
      from: "btc",
      to: "eth",
      amount: "0.1",
      rateType: "fixed",
    });

    expect(rate.amountTo).toBe(1.5);
    expect(capturedParams.from).toBe("btc");
    expect(capturedParams.to).toBe("eth");
    expect(capturedParams.rateType).toBe("fixed");
  });

  test("createTransaction posts order parameters", async () => {
    let capturedData: any;
    mock.onPost("/v1/exchange/create").reply((config) => {
      capturedData = JSON.parse(config.data);
      return [
        200,
        {
          id: "tx_999",
          status: "waiting",
          from: "btc",
          to: "eth",
          amountDeposit: 0.1,
          amountEstimated: 1.5,
          addressDeposit: "1DepositAddress...",
          addressReceive: "0xReceiveAddress...",
          createdAt: "2026-05-09T13:45:00Z",
        },
      ];
    });

    const order = await client.createTransaction({
      from: "btc",
      to: "eth",
      amountDeposit: "0.1",
      addressReceive: "0xReceiveAddress...",
      quotaId: "quota_123",
    });

    expect(order.id).toBe("tx_999");
    expect(capturedData.addressReceive).toBe("0xReceiveAddress...");
  });

  test("getTransaction fetches transaction status", async () => {
    mock.onGet("/v1/exchange/tx").reply(200, {
      id: "tx_999",
      status: "finished",
      from: "btc",
      to: "eth",
      amountDeposit: 0.1,
      amountEstimated: 1.5,
    });

    const tx = await client.getTransaction("tx_999");
    expect(tx.status).toBe("finished");
  });

  test("validateAddress returns address validity", async () => {
    mock.onGet("/v1/exchange/validate/address").reply(200, {
      result: true,
      message: null,
    });

    const res = await client.validateAddress({
      currency: "eth",
      network: "ETH",
      address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
    });

    expect(res.result).toBe(true);
  });

  test("getDEXBlockchains unwraps result list", async () => {
    mock.onGet("/v1/dex/blockchains").reply(200, {
      error: false,
      result: [{ chainId: 1, name: "Ethereum" }],
    });

    const chains = await client.getDEXBlockchains();
    expect(chains).toHaveLength(1);
    expect(chains[0].name).toBe("Ethereum");
  });

  test("throws SwapzoneError when response body contains error: true", async () => {
    mock.onGet("/v1/exchange/validate/address").reply(200, {
      error: true,
      message: "Check params",
    });

    await expect(
      client.validateAddress({ currency: "eth", address: "invalid" })
    ).rejects.toThrow(SwapzoneError);
  });

  test("throws SwapzoneError on HTTP 401 error", async () => {
    mock.onGet("/v1/exchange/currencies").reply(401, {
      error: true,
      message: "Invalid API key",
    });

    await expect(client.getCurrencies()).rejects.toThrow(SwapzoneError);
  });
});
