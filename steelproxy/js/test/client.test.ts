import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  createSteelProxyError,
  OrderStatusCode,
  ProxyType,
  RotationMode,
  SteelProxy,
  SteelProxyConflictError,
  SteelProxyError,
  SteelProxyNotFoundError,
  SteelProxyPaymentRequiredError,
  SteelProxyUnauthorizedError,
  SteelProxyValidationError,
} from "../src/index.js";

describe("SteelProxy client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  describe("authentication and headers", () => {
    it("sends X-API-Key and custom User-Agent headers", async () => {
      const client = new SteelProxy({ apiKey: "test-api-key" });

      mock.onGet("https://api.steelproxy.com/v1/proxy-types").reply((config) => {
        expect(config.headers?.["X-API-Key"]).toBe("test-api-key");
        expect(config.headers?.["User-Agent"]).toBe("steelproxy/0.1.0");
        return [
          200,
          {
            status: 200,
            message: "",
            data: [{ code: "server", title: "Серверные" }],
          },
        ];
      });

      const types = await client.getProxyTypes();
      expect(types).toHaveLength(1);
      expect(types[0].code).toBe("server");
    });

    it("respects custom baseURL and userAgent", async () => {
      const client = new SteelProxy({
        apiKey: "custom-key",
        baseURL: "https://custom.api.steelproxy.com/v1",
        userAgent: "custom-agent/2.0",
      });

      mock.onGet("https://custom.api.steelproxy.com/v1/proxy-types").reply((config) => {
        expect(config.headers?.["X-API-Key"]).toBe("custom-key");
        expect(config.headers?.["User-Agent"]).toBe("custom-agent/2.0");
        return [200, { status: 200, message: "", data: [] }];
      });

      const types = await client.getProxyTypes();
      expect(types).toEqual([]);
    });
  });

  describe("getProxyTypes", () => {
    it("successfully retrieves proxy types", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/proxy-types").reply(200, {
        status: 200,
        message: "",
        data: [
          { code: ProxyType.SERVER, title: "Серверные" },
          { code: ProxyType.RESIDENTIAL, title: "Резидентские" },
          { code: ProxyType.ROTATION, title: "Ротационные" },
        ],
      });

      const types = await client.getProxyTypes();
      expect(types).toHaveLength(3);
      expect(types[0].code).toBe("server");
      expect(types[1].code).toBe("residential");
      expect(types[2].code).toBe("rotation");
    });

    it("throws SteelProxyUnauthorizedError on 401 response", async () => {
      const client = new SteelProxy({ apiKey: "invalid-key" });

      mock.onGet("https://api.steelproxy.com/v1/proxy-types").reply(401, {
        status: 401,
        message: "Отсутствует или неверен API-ключ",
        data: null,
      });

      await expect(client.getProxyTypes()).rejects.toThrow(SteelProxyUnauthorizedError);
    });
  });

  describe("getLocations", () => {
    it("successfully retrieves locations with optional query filter", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/locations").reply((config) => {
        expect(config.params?.proxy_type).toBe("residential");
        return [
          200,
          {
            status: 200,
            message: "",
            data: [
              {
                node_id: 5,
                country_code: "US",
                title: "США",
                proxy_type: "residential",
                terms_days: [1, 7, 14, 30],
              },
            ],
          },
        ];
      });

      const locations = await client.getLocations({ proxy_type: "residential" });
      expect(locations).toHaveLength(1);
      expect(locations[0].node_id).toBe(5);
      expect(locations[0].country_code).toBe("US");
      expect(locations[0].terms_days).toEqual([1, 7, 14, 30]);
    });

    it("throws SteelProxyError on server failure", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/locations").reply(500, {
        status: 500,
        message: "Internal server error",
      });

      await expect(client.getLocations()).rejects.toThrow(SteelProxyError);
    });
  });

  describe("getTerms", () => {
    it("successfully retrieves flat list of terms", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/terms").reply(200, {
        status: 200,
        message: "",
        data: [1, 7, 14, 30],
      });

      const terms = await client.getTerms();
      expect(terms).toEqual([1, 7, 14, 30]);
    });

    it("throws SteelProxyUnauthorizedError on 401", async () => {
      const client = new SteelProxy({ apiKey: "bad-key" });

      mock.onGet("https://api.steelproxy.com/v1/terms").reply(401, {
        status: 401,
        message: "Unauthorized",
      });

      await expect(client.getTerms()).rejects.toThrow(SteelProxyUnauthorizedError);
    });
  });

  describe("getPrices", () => {
    it("successfully retrieves prices with filters", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/prices").reply((config) => {
        expect(config.params?.country_code).toBe("US");
        expect(config.params?.proxy_type).toBe("residential");
        return [
          200,
          {
            status: 200,
            message: "",
            data: [
              {
                proxy_type: "residential",
                country_code: "US",
                node_id: 5,
                term_days: 7,
                price: "47.50",
                currency: "RUB",
              },
            ],
          },
        ];
      });

      const prices = await client.getPrices({ country_code: "US", proxy_type: "residential" });
      expect(prices).toHaveLength(1);
      expect(prices[0].price).toBe("47.50");
      expect(prices[0].currency).toBe("RUB");
    });

    it("throws on error", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/prices").reply(403, {
        status: 403,
        message: "Account blocked",
      });

      await expect(client.getPrices()).rejects.toThrow("Account blocked");
    });
  });

  describe("createOrder", () => {
    it("successfully creates order and returns proxies", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      const mockCreated = {
        order_id: 118432,
        created_at: "2026-08-20T10:00:00Z",
        expires_at: "2026-08-27T10:00:00Z",
        proxy_type: "residential",
        location: "US",
        term_days: 7,
        quantity: 1,
        price: "47.50",
        currency: "RUB",
        balance_after: "4952.50",
        proxies: [
          {
            username: "user1",
            password: "pass1",
            host: "dc01.steelproxy.com",
            http_port: "3071",
            socks5_port: "3072",
            connection_string_http: "user1:pass1@dc01.steelproxy.com:3071",
            connection_string_socks5: "user1:pass1@dc01.steelproxy.com:3072",
            rotate_link: null,
          },
        ],
      };

      mock.onPost("https://api.steelproxy.com/v1/orders").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.proxy_type).toBe("residential");
        expect(body.node_id).toBe(5);
        expect(body.term_days).toBe(7);
        expect(body.quantity).toBe(1);
        expect(body.buyer_reference).toBe("ref-123");
        return [200, { status: 200, message: "", data: mockCreated }];
      });

      const order = await client.createOrder({
        proxy_type: "residential",
        node_id: 5,
        term_days: 7,
        quantity: 1,
        buyer_reference: "ref-123",
      });

      expect(order.order_id).toBe(118432);
      expect(order.proxies).toHaveLength(1);
      expect(order.proxies[0].connection_string_http).toBe("user1:pass1@dc01.steelproxy.com:3071");
    });

    it("validates required createOrder fields", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      await expect(
        client.createOrder({ proxy_type: "", node_id: 1, term_days: 7, quantity: 1 })
      ).rejects.toThrow("proxy_type is required");

      await expect(
        client.createOrder({ proxy_type: "server", node_id: (undefined as any), term_days: 7, quantity: 1 })
      ).rejects.toThrow("node_id is required");

      await expect(
        client.createOrder({ proxy_type: "server", node_id: 1, term_days: 0, quantity: 1 })
      ).rejects.toThrow("term_days must be a positive integer");

      await expect(
        client.createOrder({ proxy_type: "server", node_id: 1, term_days: 7, quantity: 0 })
      ).rejects.toThrow("quantity must be a positive integer");
    });

    it("throws SteelProxyPaymentRequiredError on 402 insufficient funds", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onPost("https://api.steelproxy.com/v1/orders").reply(402, {
        status: 402,
        message: "Недостаточно средств на вашем балансе",
        data: null,
      });

      await expect(
        client.createOrder({ proxy_type: "server", node_id: 1, term_days: 30, quantity: 1 })
      ).rejects.toThrow(SteelProxyPaymentRequiredError);
    });

    it("throws SteelProxyConflictError on 409 out of stock", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onPost("https://api.steelproxy.com/v1/orders").reply(409, {
        status: 409,
        message: "На выбранной локации нет свободных прокси",
        data: null,
      });

      await expect(
        client.createOrder({ proxy_type: "server", node_id: 1, term_days: 30, quantity: 1 })
      ).rejects.toThrow(SteelProxyConflictError);
    });
  });

  describe("getOrder", () => {
    it("successfully retrieves order details", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/orders/118432").reply(200, {
        status: 200,
        message: "",
        data: {
          order_id: 118432,
          status: "active",
          proxy_type: "residential",
          location: "US",
          term_days: 7,
          quantity: 1,
          price: "47.50",
          currency: "RUB",
          created_at: "2026-08-20T10:00:00Z",
          expires_at: "2026-08-27T10:00:00Z",
          buyer_reference: "order-8841",
          proxies: [],
        },
      });

      const order = await client.getOrder(118432);
      expect(order.order_id).toBe(118432);
      expect(order.status).toBe("active");
    });

    it("throws SteelProxyNotFoundError on 404 response", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/orders/999999").reply(404, {
        status: 404,
        message: "Заказ не найден",
      });

      await expect(client.getOrder(999999)).rejects.toThrow(SteelProxyNotFoundError);
    });
  });

  describe("getOrders", () => {
    it("successfully retrieves paginated orders list", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onGet("https://api.steelproxy.com/v1/orders").reply((config) => {
        expect(config.params?.page).toBe(2);
        expect(config.params?.page_size).toBe(10);
        return [
          200,
          {
            status: 200,
            message: "",
            data: {
              total: 50,
              page: 2,
              page_size: 10,
              items: [
                {
                  order_id: 118430,
                  status: "active",
                  proxy_type: "server",
                  location: "RU",
                  term_days: 30,
                  quantity: 1,
                  price: "100.00",
                  currency: "RUB",
                  created_at: "2026-08-20T10:00:00Z",
                  buyer_reference: null,
                },
              ],
            },
          },
        ];
      });

      const list = await client.getOrders({ page: 2, page_size: 10 });
      expect(list.total).toBe(50);
      expect(list.items).toHaveLength(1);
      expect(list.items[0].order_id).toBe(118430);
    });

    it("throws SteelProxyUnauthorizedError on 401", async () => {
      const client = new SteelProxy({ apiKey: "bad-key" });

      mock.onGet("https://api.steelproxy.com/v1/orders").reply(401, {
        status: 401,
        message: "Unauthorized",
      });

      await expect(client.getOrders()).rejects.toThrow(SteelProxyUnauthorizedError);
    });
  });

  describe("extendOrder", () => {
    it("successfully extends an order", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onPost("https://api.steelproxy.com/v1/orders/118432/extend").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.months).toBe(1);
        return [
          200,
          {
            status: 200,
            message: "",
            data: {
              order_id: 118432,
              months: 1,
              price: "100.00",
              currency: "RUB",
              previous_expires_at: "2026-08-27T10:00:00Z",
              expires_at: "2026-09-26T10:00:00Z",
              balance_after: "4805.00",
            },
          },
        ];
      });

      const ext = await client.extendOrder(118432, { months: 1 });
      expect(ext.order_id).toBe(118432);
      expect(ext.months).toBe(1);
      expect(ext.expires_at).toBe("2026-09-26T10:00:00Z");
    });

    it("validates extend parameters", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      await expect(client.extendOrder(NaN, { months: 1 })).rejects.toThrow("order_id must be a valid number");
      await expect(client.extendOrder(123, { months: (undefined as any) })).rejects.toThrow("months must be a valid number");
    });

    it("throws SteelProxyPaymentRequiredError on 402", async () => {
      const client = new SteelProxy({ apiKey: "valid-key" });

      mock.onPost("https://api.steelproxy.com/v1/orders/118432/extend").reply(402, {
        status: 402,
        message: "Недостаточно средств",
      });

      await expect(client.extendOrder(118432, { months: 1 })).rejects.toThrow(SteelProxyPaymentRequiredError);
    });
  });

  describe("createOrderWebhook & buildWebhookUrl", () => {
    it("successfully executes createOrderWebhook", async () => {
      const client = new SteelProxy({ apiKey: "webhook-key" });

      mock.onPost("https://api.steelproxy.com/v1/orders/webhook").reply((config) => {
        expect(config.params?.api_key).toBe("webhook-key");
        expect(config.params?.proxy_type).toBe("residential");
        expect(config.params?.country_code).toBe("US");
        expect(config.params?.term_days).toBe(7);
        const data = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
        expect(data?.count).toBe(2);
        expect(data?.buyer).toBe("order-8841");

        return [
          200,
          {
            status: 200,
            message: "",
            data: {
              order_id: 118433,
              created_at: "2026-08-20T10:00:00Z",
              expires_at: "2026-08-27T10:00:00Z",
              proxy_type: "residential",
              location: "US",
              term_days: 7,
              quantity: 2,
              price: "95.00",
              currency: "RUB",
              balance_after: "4810.00",
              proxies: [],
            },
          },
        ];
      });

      const order = await client.createOrderWebhook({
        proxy_type: "residential",
        country_code: "US",
        term_days: 7,
        count: 2,
        buyer: "order-8841",
      });

      expect(order.order_id).toBe(118433);
      expect(order.quantity).toBe(2);
    });

    it("builds static webhook URL correctly", () => {
      const client = new SteelProxy({ apiKey: "sp_live_key" });
      const url = client.buildWebhookUrl({
        proxy_type: "rotation",
        country_code: "DE",
        term_days: 14,
        rotation_mode: "timer",
        timer_interval: 10,
      });

      expect(url).toContain("https://api.steelproxy.com/v1/orders/webhook");
      expect(url).toContain("api_key=sp_live_key");
      expect(url).toContain("proxy_type=rotation");
      expect(url).toContain("country_code=DE");
      expect(url).toContain("term_days=14");
      expect(url).toContain("rotation_mode=timer");
      expect(url).toContain("timer_interval=10");
    });
  });

  describe("health check", () => {
    it("successfully calls health endpoint", async () => {
      const client = new SteelProxy();

      mock.onGet("https://api.steelproxy.com/health").reply(200, {
        status: "ok",
      });

      const res = await client.health();
      expect(res.status).toBe("ok");
    });
  });
});
