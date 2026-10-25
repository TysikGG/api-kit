import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { REF_ID, SMSBulk, SMSBulkError } from "../src/index.js";

describe("SMSBulk client", () => {
  let mock: MockAdapter;
  let client: SMSBulk;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new SMSBulk({ apiKey: "test-api-key" });
  });

  afterEach(() => {
    mock.restore();
  });

  test("REF_ID constant matches expected partner code", () => {
    expect(REF_ID).toBe("3XTTWRX9");
  });

  test("createActivation sends ref_id in the request payload", async () => {
    let capturedBody: any;
    mock.onPost("/v1/activations").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [
        201,
        {
          id: "act_123",
          status: "WAITING",
          phoneNumber: "+12025550199",
          purged: false,
          userCost: "0.50",
          currency: "USD",
          service: { code: "wa", slug: "whatsapp", name: "WhatsApp" },
          country: { isoCode: "US", name: "USA" },
          createdAt: "2026-05-09T13:45:00Z",
          cancellable: false,
        },
      ];
    });

    const res = await client.createActivation({
      serviceCode: "wa",
      countryIso: "US",
      operator: "any",
      maxPrice: "0.50",
    });

    expect(capturedBody).toBeDefined();
    expect(capturedBody.ref_id).toBe("3XTTWRX9");
    expect(capturedBody.serviceCode).toBe("wa");
    expect(capturedBody.countryIso).toBe("US");
    expect(capturedBody.operator).toBe("any");
    expect(capturedBody.maxPrice).toBe("0.50");
    expect(res.phoneNumber).toBe("+12025550199");
  });

  test("getBalance returns wallet balance", async () => {
    mock.onGet("/v1/wallet/balance").reply(200, {
      balance: "25.00",
      currency: "USD",
    });

    const balance = await client.getBalance();
    expect(balance.balance).toBe("25.00");
    expect(balance.currency).toBe("USD");
  });

  test("getTransactions lists wallet transactions", async () => {
    mock.onGet("/v1/wallet/transactions").reply(200, {
      data: [
        {
          id: "tx_1",
          amount: "-0.50",
          currency: "USD",
          type: "activation",
          createdAt: "2026-05-09T13:45:00Z",
        },
      ],
      nextCursor: null,
    });

    const res = await client.getTransactions({ limit: 5 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe("tx_1");
  });

  test("getServices and getService return catalog data", async () => {
    mock.onGet("/v1/services").reply(200, {
      data: [
        {
          code: "wa",
          slug: "whatsapp",
          name: "WhatsApp",
          countryCount: 50,
          totalStock: 1000,
          minPrice: "0.10",
        },
      ],
      count: 1,
    });

    mock.onGet("/v1/services/whatsapp").reply(200, {
      code: "wa",
      slug: "whatsapp",
      name: "WhatsApp",
      countryCount: 50,
      totalStock: 1000,
      minPrice: "0.10",
    });

    const services = await client.getServices();
    expect(services.count).toBe(1);
    expect(services.data[0].code).toBe("wa");

    const single = await client.getService("whatsapp");
    expect(single.slug).toBe("whatsapp");
  });

  test("getCountries and getServiceCountries return country catalog", async () => {
    mock.onGet("/v1/countries").reply(200, {
      data: [{ isoCode: "US", name: "United States" }],
      count: 1,
    });

    mock.onGet("/v1/services/whatsapp/countries").reply(200, {
      service: { code: "wa", slug: "whatsapp", name: "WhatsApp" },
      countries: [
        {
          isoCode: "US",
          name: "USA",
          price: "0.20",
          currency: "USD",
          stock: 500,
          availability: "ok",
        },
      ],
      count: 1,
    });

    const countries = await client.getCountries();
    expect(countries.count).toBe(1);
    expect(countries.data[0].isoCode).toBe("US");

    const sc = await client.getServiceCountries("whatsapp");
    expect(sc.countries).toHaveLength(1);
    expect(sc.countries[0].price).toBe("0.20");
  });

  test("activations lifecycle: list, get, cancel, complete, resend", async () => {
    const sampleAct = {
      id: "act_123",
      status: "WAITING",
      phoneNumber: "+12025550199",
      purged: false,
      userCost: "0.50",
      currency: "USD",
      service: { code: "wa", slug: "whatsapp", name: "WhatsApp" },
      country: { isoCode: "US", name: "USA" },
      createdAt: "2026-05-09T13:45:00Z",
      cancellable: true,
    };

    mock.onGet("/v1/activations").reply(200, { data: [sampleAct], nextCursor: null });
    mock.onGet("/v1/activations/act_123").reply(200, sampleAct);
    mock.onDelete("/v1/activations/act_123").reply(200, { ...sampleAct, status: "CANCELLED" });
    mock.onPost("/v1/activations/act_123/complete").reply(200, { ...sampleAct, status: "RECEIVED" });
    mock.onPost("/v1/activations/act_123/request-resend").reply(200, sampleAct);

    const list = await client.getActivations();
    expect(list.data).toHaveLength(1);

    const get = await client.getActivation("act_123");
    expect(get.id).toBe("act_123");

    const cancelled = await client.cancelActivation("act_123");
    expect(cancelled.status).toBe("CANCELLED");

    const completed = await client.completeActivation("act_123");
    expect(completed.status).toBe("RECEIVED");

    const resent = await client.resendActivation("act_123");
    expect(resent.id).toBe("act_123");
  });

  test("email activations: domains, create, list, get, cancel, reorder", async () => {
    mock.onGet("/v1/email-activations/domains").reply(200, [
      { name: "gmx.com", price: 0.02, count: 500, currency: "USD", disabled: false },
    ]);

    const sampleEmail = {
      id: "em_1",
      site: "telegram.com",
      domain: "gmx.com",
      emailAddress: "abc@gmx.com",
      status: "WAITING",
      userCost: "0.02",
      currency: "USD",
      createdAt: "2026-05-09T13:45:00Z",
    };

    mock.onPost("/v1/email-activations").reply(201, sampleEmail);
    mock.onGet("/v1/email-activations").reply(200, { data: [sampleEmail], nextCursor: null });
    mock.onGet("/v1/email-activations/em_1").reply(200, sampleEmail);
    mock.onDelete("/v1/email-activations/em_1").reply(200, { ...sampleEmail, status: "CANCELLED" });
    mock.onPost("/v1/email-activations/em_1/reorder").reply(200, sampleEmail);

    const domains = await client.getEmailDomains("telegram.com");
    expect(domains[0].name).toBe("gmx.com");

    const created = await client.createEmailActivation({
      site: "telegram.com",
      domain: "gmx.com",
    });
    expect(created.emailAddress).toBe("abc@gmx.com");

    const list = await client.getEmailActivations();
    expect(list.data).toHaveLength(1);

    const get = await client.getEmailActivation("em_1");
    expect(get.id).toBe("em_1");

    const cancelled = await client.cancelEmailActivation("em_1");
    expect(cancelled.status).toBe("CANCELLED");

    const reordered = await client.reorderEmailActivation("em_1");
    expect(reordered.id).toBe("em_1");
  });

  test("throws SMSBulkError on 401 unauthorized", async () => {
    mock.onGet("/v1/wallet/balance").reply(401, {
      statusCode: 401,
      message: "API key required",
      error: "Unauthorized",
    });

    await expect(client.getBalance()).rejects.toThrow(SMSBulkError);
    try {
      await client.getBalance();
    } catch (err) {
      expect(err).toBeInstanceOf(SMSBulkError);
      const e = err as SMSBulkError;
      expect(e.statusCode).toBe(401);
      expect(e.code).toBe("Unauthorized");
    }
  });

  test("throws SMSBulkError on 402 insufficient balance", async () => {
    mock.onPost("/v1/activations").reply(402, {
      statusCode: 402,
      error: "insufficient_balance",
      required: "0.50",
      available: "0.10",
    });

    await expect(
      client.createActivation({ serviceCode: "wa", countryIso: "US" })
    ).rejects.toThrow(SMSBulkError);
  });
});
