import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  GreedySMS,
  GreedySMSError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../src/index.js";

describe("GreedySMS Client", () => {
  let mock: MockAdapter;
  let client: GreedySMS;

  beforeEach(() => {
    const axiosInstance = axios.create();
    mock = new MockAdapter(axiosInstance);
    client = new GreedySMS({
      apiKey: "test-api-key",
      axios: axiosInstance,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe("Constructor & Initialization", () => {
    it("initializes with options object or string", () => {
      const c1 = new GreedySMS({ apiKey: "key1" });
      const c2 = new GreedySMS("key2");
      expect(c1).toBeInstanceOf(GreedySMS);
      expect(c2).toBeInstanceOf(GreedySMS);
    });

    it("rejects empty or blank API key", () => {
      expect(() => new GreedySMS({ apiKey: "" })).toThrow(AuthenticationError);
      expect(() => new GreedySMS("   ")).toThrow(AuthenticationError);
    });
  });

  describe("System & User", () => {
    it("checkHealth returns health status", async () => {
      mock.onGet("/health/live").reply(200, { status: "ok" });
      const res = await client.checkHealth();
      expect(res.status).toBe("ok");
    });

    it("getMe returns user info", async () => {
      const userData = {
        id: "usr_123",
        purchases: { activations: 15, rents: 2 },
        discount: { level: "Silver", percent: 5 },
        balance: 500.5,
        referralBalance: 25.0,
      };

      mock.onGet("/users/getMe").reply((config) => {
        expect(config.headers?.["x-api-key"]).toBe("test-api-key");
        return [200, userData];
      });

      const res = await client.getMe();
      expect(res.id).toBe("usr_123");
      expect(res.balance).toBe(500.5);
    });

    it("getBalance returns numeric balance", async () => {
      mock.onGet("/users/getMe").reply(200, {
        id: "usr_123",
        purchases: { activations: 0, rents: 0 },
        discount: { level: "None", percent: 0 },
        balance: 320.75,
        referralBalance: 0,
      });

      const balance = await client.getBalance();
      expect(balance).toBe(320.75);
    });
  });

  describe("Activations: Catalog & Directories", () => {
    it("getOperators returns operator list", async () => {
      const data = [{ country: "0", operators: ["mts", "beeline"] }];
      mock.onPost("/activations/getOperators").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.country).toBe(0);
        return [200, data];
      });

      const res = await client.getOperators(0);
      expect(res[0].operators).toContain("mts");
    });

    it("getCountries returns paginated country list", async () => {
      const data = {
        countries: [{ id: 0, title: { rus: "Россия", eng: "Russia" }, image: "ru.png" }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };

      mock.onPost("/activations/getCountries").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.page).toBe(1);
        return [200, data];
      });

      const res = await client.getCountries({ page: 1, pageSize: 10 });
      expect(res.countries[0].title.eng).toBe("Russia");
    });

    it("getServices returns service list", async () => {
      const data = {
        services: [{ id: "tg", name: "Telegram" }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };

      mock.onPost("/activations/getServices").reply(200, data);
      const res = await client.getServices({ country: 0, language: "eng" });
      expect(res.services[0].id).toBe("tg");
    });

    it("getPrices returns price list", async () => {
      const data = {
        countries: [{ country: 0, services: [{ name: "Telegram", count: 100, price: 15 }] }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };

      mock.onPost("/activations/getPrices").reply(200, data);
      const res = await client.getPrices({ country: 0, service: "tg" });
      expect(res.countries[0].services[0].price).toBe(15);
    });

    it("getNumbersStatus returns availability", async () => {
      const data = {
        numbers: [{ id: "0", count: 50 }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };

      mock.onPost("/activations/getNumbersStatus").reply(200, data);
      const res = await client.getNumbersStatus({ service: "tg", page: 1 });
      expect(res.numbers[0].count).toBe(50);
    });

    it("getListOfTopCountriesByService returns top 10", async () => {
      const data = [{ country: 0, price: 12.5 }];
      mock.onPost("/activations/getListOfTopCountriesByService").reply(200, data);
      const res = await client.getListOfTopCountriesByService("tg");
      expect(res[0].price).toBe(12.5);
    });

    it("getTopCountriesByService returns paginated top countries", async () => {
      const data = {
        countries: [{ id: 0, count: 100, price: 12.5 }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };

      mock.onPost("/activations/getTopCountriesByService").reply(200, data);
      const res = await client.getTopCountriesByService({ service: "tg", page: 1 });
      expect(res.countries[0].id).toBe(0);
    });
  });

  describe("Activations: Order & Lifecycle", () => {
    it("getNumber orders a phone number", async () => {
      const data = { activationId: 1001, phone: "79001234567", price: 15.0 };
      mock.onPost("/activations/getNumber").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.service).toBe("tg");
        expect(body.country).toBe(0);
        return [200, data];
      });

      const res = await client.getNumber({ service: "tg", country: 0 });
      expect(res.activationId).toBe(1001);
      expect(res.phone).toBe("79001234567");
    });

    it("getStatus and getStatusAlternative check status", async () => {
      mock.onPost("/activations/getStatus").reply(200, { status: "STATUS_OK:12345" });
      const s1 = await client.getStatus(1001);
      expect(s1.status).toBe("STATUS_OK:12345");

      mock.onPost("/activations/getStatusAlternative").reply(200, { status: "STATUS_WAIT_CODE" });
      const s2 = await client.getStatusAlternative(1001);
      expect(s2.status).toBe("STATUS_WAIT_CODE");
    });

    it("setStatus and convenience helpers update status", async () => {
      mock.onPost("/activations/setStatus").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.activationId).toBe(1001);
        return [200, { status: body.status }];
      });

      expect((await client.setStatus(1001, "Finish")).status).toBe("Finish");
      expect((await client.cancelActivation(1001)).status).toBe("Cancel");
      expect((await client.finishActivation(1001)).status).toBe("Finish");
      expect((await client.requestNewCode(1001)).status).toBe("NewCode");
    });

    it("getHistory returns activation history", async () => {
      const data = {
        activations: [
          {
            id: 1001,
            sourceId: 1001,
            source: "API",
            canManageViaApi: true,
            date: "2026-11-17T00:00:00Z",
            phone: "79001112233",
            service: "tg",
            country: 0,
            sms: [{ code: "1234", date: "2026-11-17T00:01:00Z" }],
          },
        ],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };

      mock.onPost("/activations/getHistory").reply(200, data);
      const res = await client.getHistory({ active: false });
      expect(res.activations[0].id).toBe(1001);
    });
  });

  describe("Rental methods", () => {
    it("getRentPrices", async () => {
      mock.onPost("/rent/getRentPrices").reply(200, { "4": 50 });
      const res = await client.getRentPrices({ service: "tg", country: 0 });
      expect(res["4"]).toBe(50);
    });

    it("getRentList", async () => {
      const data = {
        rents: [{ id: 55, phone: "79998887766", price: 100, endDate: "2026-11-18" }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };
      mock.onPost("/rent/getRentList").reply(200, data);
      const res = await client.getRentList();
      expect(res.rents[0].id).toBe(55);
    });

    it("getRentStatus", async () => {
      const data = {
        sms: [{ phone: "Service", text: "Code: 4321", date: "2026-11-17" }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      };
      mock.onPost("/rent/getRentStatus").reply(200, data);
      const res = await client.getRentStatus({ rentId: 55, page: 1, pageSize: 10 });
      expect(res.sms[0].text).toBe("Code: 4321");
    });

    it("getContinueRentPriceNumber", async () => {
      mock.onPost("/rent/getContinueRentPriceNumber").reply(200, { price: 35.0 });
      const res = await client.getContinueRentPriceNumber({ rentId: 55, time: 4 });
      expect(res.price).toBe(35.0);
    });

    it("getRentNumber", async () => {
      const data = { rentId: 55, phone: "79998887766", price: 100, endDate: "2026-11-18" };
      mock.onPost("/rent/getRentNumber").reply(200, data);
      const res = await client.getRentNumber({ service: "tg", country: 0, time: 4 });
      expect(res.rentId).toBe(55);
    });

    it("setRentStatus", async () => {
      mock.onPost("/rent/setRentStatus").reply(200, { status: "finish" });
      const res = await client.setRentStatus({ rentId: 55, status: 2 });
      expect(res.status).toBe("finish");
    });

    it("continueRentNumber and continueRentNumberV2", async () => {
      const data = { rentId: 55, phone: "79998887766", price: 35, endDate: "2026-11-18" };
      mock.onPost("/rent/continueRentNumber").reply(200, data);
      mock.onPost("/v2/rent/continueRentNumber").reply(200, data);

      const r1 = await client.continueRentNumber({ rentId: 55, time: 4 });
      expect(r1.rentId).toBe(55);

      const r2 = await client.continueRentNumberV2({ rentId: 55, time: 4 });
      expect(r2.rentId).toBe(55);
    });
  });

  describe("Mail methods", () => {
    it("getMailDomains and getMailPrice", async () => {
      mock.onPost("/mail/getDomains").reply(200, [{ name: "mail.com", cost: 5, count: 20 }]);
      const d = await client.getMailDomains("discord.com");
      expect(d[0].name).toBe("mail.com");

      mock.onPost("/mail/getPrice").reply(200, { cost: 5, domain: "mail.com", url: "discord.com" });
      const p = await client.getMailPrice("discord.com", "mail.com");
      expect(p.cost).toBe(5);
    });

    it("buyMailDomain and reorderMailDomain", async () => {
      const data = { id: 77, email: "test@mail.com", price: 5, site: "discord.com", status: "active" };
      mock.onPost("/mail/buyDomain").reply(200, data);
      const b = await client.buyMailDomain("discord.com", "mail.com");
      expect(b.id).toBe(77);

      mock.onPost("/mail/reorderDomain").reply(200, data);
      const r = await client.reorderMailDomain(77);
      expect(r.id).toBe(77);
    });

    it("getMailStatus, cancelMailOrder, getMailOrders", async () => {
      mock.onPost("/mail/getStatus").reply(200, {
        email: "test@mail.com",
        site: "discord.com",
        status: "received",
        message: "Your code is 12345",
        value: "12345",
      });
      const s = await client.getMailStatus(77);
      expect(s.value).toBe("12345");

      mock.onPost("/mail/cancelOrder").reply(200, { balance: 505.0, status: "canceled" });
      const c = await client.cancelMailOrder(77);
      expect(c.status).toBe("canceled");

      mock.onPost("/mail/getOrders").reply(200, {
        orders: [{ id: 77, email: "test@mail.com", site: "discord.com", price: 5, status: "active", date: "now" }],
        total: 1,
        totalPages: 1,
        pageSize: 10,
        nextPage: 0,
        prevPage: 0,
      });
      const o = await client.getMailOrders();
      expect(o.orders[0].id).toBe(77);
    });
  });

  describe("Legacy handler_api.php", () => {
    it("handlerApi calls stubs/handler_api.php", async () => {
      mock.onGet("/stubs/handler_api.php").reply((config) => {
        expect(config.params?.action).toBe("getBalance");
        expect(config.params?.api_key).toBe("test-api-key");
        return [200, "ACCESS_BALANCE:100.00"];
      });

      const res = await client.handlerApi("getBalance");
      expect(res).toBe("ACCESS_BALANCE:100.00");
    });
  });

  describe("Error Handling", () => {
    it("handles 401 Unauthorized", async () => {
      mock.onGet("/users/getMe").reply(401, {
        status: "error",
        code: 401,
        message: "Unauthorized",
      });

      await expect(client.getMe()).rejects.toThrow(AuthenticationError);
    });

    it("handles 403 Forbidden", async () => {
      mock.onGet("/users/getMe").reply(403, {
        status: "error",
        code: 403,
        message: "Forbidden",
      });

      await expect(client.getMe()).rejects.toThrow(ForbiddenError);
    });

    it("handles 404 NotFound", async () => {
      mock.onPost("/activations/getStatus").reply(404, {
        status: "error",
        code: 404,
        message: "The requested order was not found",
      });

      await expect(client.getStatus(999)).rejects.toThrow(NotFoundError);
    });

    it("handles 409 Conflict", async () => {
      mock.onPost("/activations/setStatus").reply(409, {
        status: "error",
        code: 409,
        message: "The operation conflicts with current state",
      });

      await expect(client.setStatus(999, "Finish")).rejects.toThrow(ConflictError);
    });

    it("handles 422 ValidationFailed", async () => {
      mock.onPost("/activations/getNumber").reply(422, {
        status: "error",
        code: 422,
        message: "Request validation failed",
        fields: [{ field: "service", message: "service is required" }],
      });

      try {
        await client.getNumber({ service: "", country: 0 });
        fail("Expected ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const vErr = err as ValidationError;
        expect(vErr.fields?.[0].field).toBe("service");
      }
    });

    it("handles 429 RateLimited", async () => {
      mock.onGet("/users/getMe").reply(429, {
        status: "error",
        code: 429,
        errorCode: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded",
        retryAfterSeconds: 30,
      });

      try {
        await client.getMe();
        fail("Expected RateLimitError");
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        const rErr = err as RateLimitError;
        expect(rErr.retryAfterSeconds).toBe(30);
      }
    });

    it("handles 500/503 ServerError", async () => {
      mock.onGet("/users/getMe").reply(500, {
        status: "error",
        code: 500,
        message: "Internal server error",
      });

      await expect(client.getMe()).rejects.toThrow(ServerError);
    });
  });
});
