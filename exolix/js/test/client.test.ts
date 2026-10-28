import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { EXOLIX_API_KEY_HEADER, Exolix, ExolixError } from "../src/index.js";

const TRANSACTION = {
  id: "dsd8f65609bb20",
  amount: 0.5,
  amountTo: 505.631486,
  coinFrom: {
    coinCode: "ETH",
    coinName: "Ethereum",
    network: "ETH",
    networkName: "Ethereum (ERC20)",
  },
  coinTo: {
    coinCode: "USDT",
    coinName: "TetherUS",
    network: "ETH",
    networkName: "Ethereum (ERC20)",
  },
  depositAddress: "0xDb3B8a6dd4ddfDCA3330eaebc1a20aF26fDbbCfa",
  withdrawalAddress: "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
  rate: 1011.262972,
  rateType: "float",
  status: "wait",
};

describe("Exolix client", () => {
  let mock: MockAdapter;
  let client: Exolix;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new Exolix({ apiKey: "test-exolix-key" });
  });

  afterEach(() => {
    mock.restore();
  });

  test("sends the affiliate API key in the Authorization header", async () => {
    expect(EXOLIX_API_KEY_HEADER).toBe("Authorization");

    let capturedHeaders: Record<string, string> | undefined;
    mock.onGet("/currencies").reply((config) => {
      capturedHeaders = config.headers as Record<string, string>;
      return [200, { data: [], count: 0 }];
    });

    await client.getCurrencies();
    expect(capturedHeaders?.[EXOLIX_API_KEY_HEADER]).toBe("test-exolix-key");
  });

  test("does not read EXOLIX_API_KEY and omits the header when no key is passed", async () => {
    const previous = process.env.EXOLIX_API_KEY;
    process.env.EXOLIX_API_KEY = "env-key-must-not-be-used";
    const anonymous = new Exolix();

    let capturedHeaders: Record<string, string> | undefined;
    mock.onGet("/currencies").reply((config) => {
      capturedHeaders = config.headers as Record<string, string>;
      return [200, { data: [], count: 0 }];
    });

    await anonymous.getCurrencies();
    expect(capturedHeaders?.[EXOLIX_API_KEY_HEADER]).toBeUndefined();
    expect(JSON.stringify(capturedHeaders)).not.toContain("env-key-must-not-be-used");

    if (previous === undefined) {
      delete process.env.EXOLIX_API_KEY;
    } else {
      process.env.EXOLIX_API_KEY = previous;
    }
  });

  test("getCurrencies forwards page, search, and withNetworks", async () => {
    let capturedParams: Record<string, unknown> | undefined;
    mock.onGet("/currencies").reply((config) => {
      capturedParams = config.params;
      return [
        200,
        {
          data: [{ code: "BTC", name: "Bitcoin", icon: "https://exolix.com/public/coins/BTC.png" }],
          count: 547,
        },
      ];
    });

    const page = await client.getCurrencies({
      page: 1,
      size: 1,
      search: "bit",
      withNetworks: true,
    });

    expect(page.count).toBe(547);
    expect(page.data[0].code).toBe("BTC");
    expect(capturedParams).toMatchObject({
      page: 1,
      size: 1,
      search: "bit",
      withNetworks: "true",
    });
    expect(capturedParams).not.toHaveProperty("apiKey");
  });

  test("getCurrencyNetworks fetches networks for a currency code", async () => {
    mock.onGet("/currencies/ETH/networks").reply(200, [
      {
        network: "ETH",
        name: "Ethereum (ERC20)",
        shortName: "ERC20",
        isDefault: true,
        addressRegex: "^(0x)[0-9A-Fa-f]{40}$",
      },
    ]);

    const networks = await client.getCurrencyNetworks("ETH");
    expect(networks).toHaveLength(1);
    expect(networks[0].network).toBe("ETH");
    expect(networks[0].isDefault).toBe(true);
  });

  test("getNetworks lists the network catalog", async () => {
    let capturedParams: Record<string, unknown> | undefined;
    mock.onGet("/currencies/networks").reply((config) => {
      capturedParams = config.params;
      return [
        200,
        {
          data: [{ network: "ETH", name: "Ethereum", shortName: "ERC20" }],
          count: 142,
        },
      ];
    });

    const page = await client.getNetworks({ page: 1, size: 10, search: "eth" });
    expect(page.count).toBe(142);
    expect(page.data[0].shortName).toBe("ERC20");
    expect(capturedParams).toMatchObject({ page: 1, size: 10, search: "eth" });
  });

  test("getRate requests a floating quote by deposit amount", async () => {
    let capturedParams: Record<string, unknown> | undefined;
    mock.onGet("/rate").reply((config) => {
      capturedParams = config.params;
      return [
        200,
        {
          fromAmount: 0.1,
          toAmount: 1.5,
          rate: 15,
          message: null,
          minAmount: 0.001,
          withdrawMin: 0.01,
          maxAmount: 10,
        },
      ];
    });

    const quote = await client.getRate({
      coinFrom: "BTC",
      coinTo: "ETH",
      networkFrom: "BTC",
      networkTo: "ETH",
      amount: 0.1,
      rateType: "float",
    });

    expect(quote.toAmount).toBe(1.5);
    expect(quote.rate).toBe(15);
    expect(capturedParams).toMatchObject({
      coinFrom: "BTC",
      coinTo: "ETH",
      networkFrom: "BTC",
      networkTo: "ETH",
      amount: "0.1",
      rateType: "float",
    });
    expect(capturedParams).not.toHaveProperty("withdrawalAmount");
    expect(capturedParams).not.toHaveProperty("apiKey");
    expect(capturedParams).not.toHaveProperty("referral");
  });

  test("getRate requests a fixed quote by withdrawal amount", async () => {
    let capturedParams: Record<string, unknown> | undefined;
    mock.onGet("/rate").reply((config) => {
      capturedParams = config.params;
      return [
        200,
        {
          fromAmount: 0.05,
          toAmount: 50,
          rate: 1000,
          message: null,
          minAmount: 0.01,
          withdrawMin: 10,
          maxAmount: 20,
        },
      ];
    });

    const quote = await client.getRate({
      coinFrom: "ETH",
      coinTo: "USDT",
      networkTo: "ETH",
      withdrawalAmount: "50",
      rateType: "fixed",
    });

    expect(quote.fromAmount).toBe(0.05);
    expect(capturedParams).toMatchObject({
      coinFrom: "ETH",
      coinTo: "USDT",
      networkTo: "ETH",
      withdrawalAmount: "50",
      rateType: "fixed",
    });
    expect(capturedParams).not.toHaveProperty("amount");
  });

  test("createTransaction posts the swap body without a referral field", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/transactions").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [200, TRANSACTION];
    });

    const tx = await client.createTransaction({
      coinFrom: "ETH",
      networkFrom: "ETH",
      coinTo: "USDT",
      networkTo: "ETH",
      amount: 0.5,
      withdrawalAddress: "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
      withdrawalExtraId: "memo",
      refundAddress: "0x0070BeBe9E30429437bD9c84C731031c27Fc7955",
      rateType: "float",
      slippage: 1,
    });

    expect(tx.id).toBe("dsd8f65609bb20");
    expect(tx.depositAddress).toBe(TRANSACTION.depositAddress);
    expect(capturedBody).toEqual({
      coinFrom: "ETH",
      networkFrom: "ETH",
      coinTo: "USDT",
      networkTo: "ETH",
      amount: 0.5,
      withdrawalAddress: "0x0E29D1E501f90649Ad5982E900c455006e4522FC",
      withdrawalExtraId: "memo",
      rateType: "float",
      refundAddress: "0x0070BeBe9E30429437bD9c84C731031c27Fc7955",
      slippage: 1,
    });
    expect(capturedBody).not.toHaveProperty("apiKey");
    expect(capturedBody).not.toHaveProperty("referral");
  });

  test("createTransaction can set withdrawalAmount instead of amount", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/transactions").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [200, { ...TRANSACTION, rateType: "fixed" }];
    });

    const tx = await client.createTransaction({
      coinFrom: "BTC",
      networkFrom: "BTC",
      coinTo: "ETH",
      networkTo: "ETH",
      withdrawalAmount: 1,
      withdrawalAddress: "0xReceiver",
      rateType: "fixed",
    });

    expect(tx.rateType).toBe("fixed");
    expect(capturedBody).not.toHaveProperty("amount");
    expect(capturedBody?.withdrawalAmount).toBe(1);
  });

  test("getTransaction fetches a transaction by id", async () => {
    mock.onGet("/transactions/ab93061434dd0s").reply(200, {
      ...TRANSACTION,
      id: "ab93061434dd0s",
      status: "exchanging",
    });

    const tx = await client.getTransaction("ab93061434dd0s");
    expect(tx.id).toBe("ab93061434dd0s");
    expect(tx.status).toBe("exchanging");
  });

  test("getTransactions lists authenticated history", async () => {
    let capturedParams: Record<string, unknown> | undefined;
    mock.onGet("/transactions").reply((config) => {
      capturedParams = config.params;
      return [200, { data: [TRANSACTION], count: 1 }];
    });

    const history = await client.getTransactions({
      page: 1,
      size: 25,
      search: "dsd8",
      sort: "createdAt",
      order: "desc",
      dateFrom: "2024-01-01",
      dateTo: "2024-02-01",
      statuses: ["success", "wait"],
    });

    expect(history.count).toBe(1);
    expect(history.data[0].id).toBe(TRANSACTION.id);
    expect(capturedParams).toMatchObject({
      page: 1,
      size: 25,
      search: "dsd8",
      sort: "createdAt",
      order: "desc",
      dateFrom: "2024-01-01",
      dateTo: "2024-02-01",
      statuses: "success,wait",
    });
  });

  test("throws ExolixError on HTTP 401", async () => {
    mock.onGet("/transactions").reply(401, {
      statusCode: 401,
      message: "Unauthorized",
      error: "Unauthorized",
    });

    await expect(client.getTransactions()).rejects.toBeInstanceOf(ExolixError);
    await expect(client.getTransactions()).rejects.toMatchObject({
      message: "Unauthorized",
      statusCode: 401,
      code: "Unauthorized",
    });
  });

  test("joins array validation messages", async () => {
    mock.onGet("/rate").reply(400, {
      statusCode: 400,
      message: ["amount must be a number", "rateType is required"],
      error: "Bad Request",
    });

    const error = await client
      .getRate({ coinFrom: "BTC", coinTo: "ETH", rateType: "float" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ExolixError);
    expect((error as ExolixError).message).toBe("amount must be a number, rateType is required");
    expect((error as ExolixError).code).toBe("Bad Request");
    expect((error as ExolixError).statusCode).toBe(400);
  });
});
