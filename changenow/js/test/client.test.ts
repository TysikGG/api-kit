import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { CHANGENOW_API_KEY_HEADER, ChangeNow, ChangeNowError } from "../src/index.js";

describe("ChangeNOW client", () => {
  let mock: MockAdapter;
  let client: ChangeNow;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new ChangeNow({ apiKey: "test-changenow-key", userIp: "203.0.113.10" });
  });

  afterEach(() => {
    mock.restore();
  });

  test("sends the partner API key header from the single constant", async () => {
    expect(CHANGENOW_API_KEY_HEADER).toBe("x-changenow-api-key");

    let capturedHeaders: Record<string, string> | undefined;
    mock.onGet("/exchange/currencies").reply((config) => {
      capturedHeaders = config.headers as Record<string, string>;
      return [200, []];
    });

    await client.getCurrencies();
    expect(capturedHeaders?.[CHANGENOW_API_KEY_HEADER]).toBe("test-changenow-key");
    expect(capturedHeaders?.["x-forwarded-for"]).toBe("203.0.113.10");
  });

  test("omits the API key header when no key is configured", async () => {
    const previous = process.env.CHANGENOW_API_KEY;
    delete process.env.CHANGENOW_API_KEY;
    const anonymous = new ChangeNow();
    let capturedHeaders: Record<string, string> | undefined;
    mock.onGet("/validate/address").reply((config) => {
      capturedHeaders = config.headers as Record<string, string>;
      return [200, { result: true, message: null }];
    });

    await anonymous.validateAddress({
      currency: "eth",
      address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
    });
    expect(capturedHeaders?.[CHANGENOW_API_KEY_HEADER]).toBeUndefined();
    if (previous === undefined) {
      delete process.env.CHANGENOW_API_KEY;
    } else {
      process.env.CHANGENOW_API_KEY = previous;
    }
  });

  test("getCurrencies forwards activity and flow filters", async () => {
    let capturedParams: Record<string, string> | undefined;
    mock.onGet("/exchange/currencies").reply((config) => {
      capturedParams = config.params;
      return [200, [{ ticker: "btc", name: "Bitcoin", network: "btc" }]];
    });

    const currencies = await client.getCurrencies({
      active: true,
      flow: "fixed-rate",
      buy: true,
    });
    expect(currencies).toHaveLength(1);
    expect(capturedParams).toMatchObject({
      active: "true",
      flow: "fixed-rate",
      buy: "true",
    });
  });

  test("getAvailablePairs, getMinAmount, and getRange query a pair", async () => {
    mock.onGet("/exchange/available-pairs").reply(200, [
      {
        fromCurrency: "btc",
        fromNetwork: "btc",
        toCurrency: "eth",
        toNetwork: "eth",
        flow: { standard: true, "fixed-rate": true },
      },
    ]);
    mock.onGet("/exchange/min-amount").reply(200, { minAmount: 0.001, flow: "standard" });
    mock.onGet("/exchange/range").reply(200, { minAmount: 0.001, maxAmount: null });

    const pairs = await client.getAvailablePairs({ fromCurrency: "btc", flow: "standard" });
    expect(pairs[0].toCurrency).toBe("eth");

    const min = await client.getMinAmount({
      fromCurrency: "btc",
      toCurrency: "eth",
      fromNetwork: "btc",
      toNetwork: "eth",
      flow: "standard",
    });
    expect(min.minAmount).toBe(0.001);

    const range = await client.getRange({
      fromCurrency: "btc",
      toCurrency: "eth",
      flow: "standard",
    });
    expect(range.maxAmount).toBeNull();
  });

  test("getEstimatedAmount covers standard and fixed-rate rate locks", async () => {
    const seen: Array<Record<string, string>> = [];
    mock.onGet("/exchange/estimated-amount").reply((config) => {
      seen.push(config.params);
      const fixed = config.params.flow === "fixed-rate";
      return [
        200,
        {
          fromAmount: 0.1,
          toAmount: fixed ? 1.5 : 1.4,
          flow: config.params.flow,
          rateId: fixed ? "rate-1" : null,
          validUntil: fixed ? "2026-01-01T00:00:00.000Z" : null,
        },
      ];
    });

    const floating = await client.getEstimatedAmount({
      fromCurrency: "btc",
      toCurrency: "eth",
      fromNetwork: "btc",
      toNetwork: "eth",
      fromAmount: 0.1,
      flow: "standard",
      type: "direct",
    });
    expect(floating.toAmount).toBe(1.4);
    expect(seen[0]).toMatchObject({
      flow: "standard",
      fromAmount: "0.1",
      type: "direct",
    });
    expect(seen[0].useRateId).toBeUndefined();

    const fixed = await client.getEstimatedAmount({
      fromCurrency: "btc",
      toCurrency: "eth",
      fromAmount: "0.1",
      flow: "fixed-rate",
      useRateId: true,
    });
    expect(fixed.rateId).toBe("rate-1");
    expect(seen[1]).toMatchObject({ flow: "fixed-rate", useRateId: "true" });
  });

  test("createExchange sends optional partner fields and omits empty ones", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/exchange").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [
        200,
        {
          id: "ex-1",
          payinAddress: "bc1qdeposit",
          payoutAddress: "0xreceive",
          flow: "standard",
          type: "direct",
        },
      ];
    });

    const order = await client.createExchange({
      fromCurrency: "btc",
      toCurrency: "eth",
      fromNetwork: "btc",
      toNetwork: "eth",
      fromAmount: 0.1,
      address: "0xreceive",
      extraId: "",
      refundAddress: "bc1qrefund",
      userId: "user-42",
      payload: { campaign: "spring" },
      contactEmail: "trader@example.com",
      source: "wallet",
      flow: "standard",
      type: "direct",
    });

    expect(order.id).toBe("ex-1");
    expect(capturedBody).toMatchObject({
      fromCurrency: "btc",
      fromAmount: "0.1",
      address: "0xreceive",
      refundAddress: "bc1qrefund",
      userId: "user-42",
      payload: { campaign: "spring" },
      contactEmail: "trader@example.com",
      source: "wallet",
      flow: "standard",
      type: "direct",
    });
    expect(capturedBody?.extraId).toBeUndefined();
  });

  test("createExchange can lock a fixed-rate rateId", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/exchange").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [200, { id: "ex-fixed", flow: "fixed-rate" }];
    });

    await client.createExchange({
      fromCurrency: "btc",
      toCurrency: "eth",
      address: "0xreceive",
      fromAmount: "0.2",
      flow: "fixed-rate",
      rateId: "rate-1",
    });
    expect(capturedBody).toMatchObject({ flow: "fixed-rate", rateId: "rate-1" });
  });

  test("getExchange returns status", async () => {
    mock.onGet("/exchange/by-id").reply(200, { id: "ex-1", status: "finished" });
    const status = await client.getExchange("ex-1");
    expect(status.status).toBe("finished");
  });

  test("validateAddress and getUserAddresses parse read-only lookups", async () => {
    mock.onGet("/validate/address").reply(200, { result: false, message: "not valid" });
    mock.onGet("/addresses-by-name").reply(200, {
      success: true,
      addresses: [{ currency: "eth", chain: "eth", address: "0xabc", protocol: "fio" }],
    });

    const check = await client.validateAddress({ currency: "eth", address: "0xbad" });
    expect(check.result).toBe(false);

    const named = await client.getUserAddresses("alice@domain");
    expect(named.addresses?.[0].protocol).toBe("fio");
  });

  test("getNetworkFee and getMarketEstimate call their endpoints", async () => {
    mock.onGet("/exchange/network-fee").reply(200, {
      estimatedFee: { deposit: { amount: 1 }, withdrawal: { amount: 2 } },
    });
    mock.onGet("/markets/estimate").reply(200, {
      fromCurrency: "usd",
      toCurrency: "btc",
      type: "direct",
      fromAmount: 100,
      toAmount: 0.001,
    });

    const fee = await client.getNetworkFee({
      fromCurrency: "usdt",
      toCurrency: "btc",
      fromNetwork: "eth",
      toNetwork: "btc",
      fromAmount: 100,
      convertedCurrency: "usd",
      convertedNetwork: "usd",
    });
    expect(fee.estimatedFee.deposit.amount).toBe(1);

    const market = await client.getMarketEstimate({
      fromCurrency: "usd",
      toCurrency: "btc",
      fromAmount: 100,
      type: "direct",
    });
    expect(market.toAmount).toBe(0.001);
  });

  test("getExchanges forwards list filters", async () => {
    let capturedParams: Record<string, unknown> | undefined;
    mock.onGet("/exchanges").reply((config) => {
      capturedParams = config.params;
      return [200, { count: 1, exchanges: [{ requestId: "req-1", status: "waiting" }] }];
    });

    const page = await client.getExchanges({
      limit: 10,
      offset: 0,
      sortDirection: "DESC",
      statuses: ["finished", "waiting"],
      userId: "user-42",
    });
    expect(page.count).toBe(1);
    expect(capturedParams).toMatchObject({
      limit: 10,
      sortDirection: "DESC",
      statuses: ["finished", "waiting"],
      userId: "user-42",
    });
  });

  test("exchange actions, continue, and refund", async () => {
    mock.onGet("/exchange/actions").reply(200, {
      error: null,
      continue: { available: true },
      refund: { available: false },
    });
    mock.onPost("/exchange/continue").reply(200, { result: { result: true } });
    let refundBody: Record<string, unknown> | undefined;
    mock.onPost("/exchange/refund").reply((config) => {
      refundBody = JSON.parse(config.data);
      return [200, { result: true }];
    });

    const actions = await client.getExchangeActions("ex-1");
    expect(actions.continue?.available).toBe(true);

    const pushed = await client.continueExchange({ id: "ex-1" });
    expect(typeof pushed.result).toBe("object");

    const refunded = await client.refundExchange({
      id: "ex-1",
      address: "bc1qrefund",
      extraId: "memo",
    });
    expect(refunded.result).toBe(true);
    expect(refundBody).toEqual({ id: "ex-1", address: "bc1qrefund", extraId: "memo" });
  });

  test("private transfer estimate and create", async () => {
    mock.onGet("/private-transfer/estimated-amount").reply(200, {
      currency: "eth",
      network: "eth",
      fromAmount: "10.1",
      toAmount: "10",
      rateId: "rate-pt",
      validUntil: "2026-01-01T00:00:00.000Z",
      warningMessage: null,
    });
    let body: Record<string, unknown> | undefined;
    mock.onPost("/private-transfer").reply((config) => {
      body = JSON.parse(config.data);
      return [200, { id: "pt-1", payinAddress: "0xdeposit" }];
    });

    const quote = await client.getPrivateTransferEstimate({
      currency: "eth",
      network: "eth",
      toAmount: 10,
      userId: "user-42",
    });
    expect(quote.rateId).toBe("rate-pt");

    const transfer = await client.createPrivateTransfer({
      currency: "eth",
      network: "eth",
      toAmount: "10",
      address: "0xreceive",
      rateId: quote.rateId,
    });
    expect(transfer.id).toBe("pt-1");
    expect(body).toMatchObject({ rateId: "rate-pt", toAmount: "10" });
  });

  test("throws ChangeNowError on HTTP errors", async () => {
    mock.onGet("/exchange/min-amount").reply(400, {
      error: "not_valid_params",
      message: "Currency btcc is not supported",
    });

    await expect(
      client.getMinAmount({ fromCurrency: "btcc", toCurrency: "eth" })
    ).rejects.toMatchObject({
      name: "ChangeNowValidationError",
      message: "Currency btcc is not supported",
      statusCode: 400,
      code: "not_valid_params",
    });
    await expect(
      client.getMinAmount({ fromCurrency: "btcc", toCurrency: "eth" })
    ).rejects.toBeInstanceOf(ChangeNowError);
  });
});
