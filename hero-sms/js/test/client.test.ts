import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  ActivationStatusCode,
  DEFAULT_REF,
  HeroSMS,
  HeroSMSError,
  NoNumbersError,
  AuthenticationError,
  ActivationNotFoundError,
  EarlyCancelError,
  WrongMaxPriceError,
  BannedError,
  AccountInactiveError,
  ChannelsLimitError,
  NoBalanceError,
  ApiJsonError,
} from "../src/index.js";

describe("HeroSMS", () => {
  let mock: MockAdapter;
  let client: HeroSMS;

  beforeEach(() => {
    const axiosInstance = axios.create();
    mock = new MockAdapter(axiosInstance);
    client = new HeroSMS({
      apiKey: "test-api-key",
      axios: axiosInstance,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe("Constructor & Initialization", () => {
    it("initializes with options object or string", () => {
      const c1 = new HeroSMS({ apiKey: "key1" });
      const c2 = new HeroSMS("key2");
      expect(c1).toBeInstanceOf(HeroSMS);
      expect(c2).toBeInstanceOf(HeroSMS);
    });

    it("rejects empty or blank API key", () => {
      expect(() => new HeroSMS({ apiKey: "" })).toThrow(HeroSMSError);
      expect(() => new HeroSMS("   ")).toThrow(HeroSMSError);
    });
  });

  describe("Referrer parameter", () => {
    it("includes the hardcoded partner ref in getNumber requests", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params?.ref).toBe(DEFAULT_REF);
        expect(config.params?.ref).toBe("tysik");
        return [200, "ACCESS_NUMBER:12345:79990001122"];
      });

      const res = await client.getNumber({ service: "tg", country: 2 });
      expect(res.activationId).toBe(12345);
      expect(res.phoneNumber).toBe("79990001122");
    });

    it("includes the hardcoded partner ref in getNumberV2 requests", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params?.ref).toBe(DEFAULT_REF);
        expect(config.params?.ref).toBe("tysik");
        return [
          200,
          {
            activationId: "12345",
            phoneNumber: "79990001122",
            activationCost: 10,
            currency: 643,
            countryCode: 2,
            countryPhoneCode: 7,
            canGetAnotherSms: true,
            activationTime: "2026-11-11 12:00:00",
            activationEndTime: "2026-11-11 12:20:00",
            activationOperator: "any",
          },
        ];
      });

      const res = await client.getNumberV2({ service: "tg", country: 2 });
      expect(res.activationId).toBe("12345");
      expect(res.phoneNumber).toBe("79990001122");
    });

    it("includes the hardcoded partner ref in getRentNumber requests", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params?.ref).toBe(DEFAULT_REF);
        expect(config.params?.ref).toBe("tysik");
        return [
          200,
          {
            activationId: "9876",
            phoneNumber: "79991112233",
            activationCost: 50,
            currency: 643,
            countryCode: 0,
            countryPhoneCode: 7,
            canGetAnotherSms: true,
            activationTime: "2026-11-11 12:00:00",
            activationEndTime: "2026-11-11 16:00:00",
            activationOperator: "tele2",
          },
        ];
      });

      const res = await client.getRentNumber({ service: "tg", country: 0, duration: 4 });
      expect(res.activationId).toBe("9876");
    });
  });

  describe("getBalance", () => {
    it("returns balance on success", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getBalance");
        expect(config.params.api_key).toBe("test-api-key");
        return [200, "ACCESS_BALANCE:145.50"];
      });

      const balance = await client.getBalance();
      expect(balance).toBe(145.5);
    });

    it("throws HeroSMSError on unexpected format", async () => {
      mock.onGet("").reply(200, "SOMETHING_UNEXPECTED");
      await expect(client.getBalance()).rejects.toThrow(HeroSMSError);
    });
  });

  describe("getNumber and getNumberV2", () => {
    it("passes all options in getNumber", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params).toEqual({
          api_key: "test-api-key",
          action: "getNumber",
          service: "wa",
          country: 1,
          maxPrice: 20,
          fixedPrice: "1",
          phoneException: "7900,7901",
          operator: "megafon",
          ref: "tysik",
        });
        return [200, "ACCESS_NUMBER:55555:79123456789"];
      });

      const result = await client.getNumber({
        service: "wa",
        country: 1,
        maxPrice: 20,
        fixedPrice: "1",
        phoneException: "7900,7901",
        operator: "megafon",
      });
      expect(result.activationId).toBe(55555);
      expect(result.phoneNumber).toBe("79123456789");
    });

    it("throws error when getNumber response does not match pattern", async () => {
      mock.onGet("").reply(200, "UNKNOWN_OK_RESPONSE");
      await expect(client.getNumber({ service: "wa", country: 1 })).rejects.toThrow("Unexpected number response");
    });
  });

  describe("Activation status methods", () => {
    it("setStatus sends action and parameters", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("setStatus");
        expect(config.params.id).toBe(1234);
        expect(config.params.status).toBe(ActivationStatusCode.SMS_SENT);
        return [200, "ACCESS_READY"];
      });

      const result = await client.setStatus(1234, ActivationStatusCode.SMS_SENT);
      expect(result).toBe("ACCESS_READY");
    });

    it("markReady calls setStatus with 1", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.status).toBe(1);
        return [200, "ACCESS_READY"];
      });
      await expect(client.markReady(1234)).resolves.toBe("ACCESS_READY");
    });

    it("requestResend calls setStatus with 3", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.status).toBe(3);
        return [200, "ACCESS_RETRY_GET"];
      });
      await expect(client.requestResend(1234)).resolves.toBe("ACCESS_RETRY_GET");
    });

    it("complete calls setStatus with 6", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.status).toBe(6);
        return [200, "ACCESS_ACTIVATION"];
      });
      await expect(client.complete(1234)).resolves.toBe("ACCESS_ACTIVATION");
    });

    it("cancel calls setStatus with 8", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.status).toBe(8);
        return [200, "ACCESS_CANCEL"];
      });
      await expect(client.cancel(1234)).resolves.toBe("ACCESS_CANCEL");
    });

    it("getStatus parses STATUS_OK with code", async () => {
      mock.onGet("").reply(200, "STATUS_OK:654321");
      const res = await client.getStatus(1234);
      expect(res).toEqual({ status: "STATUS_OK", code: "654321" });
    });

    it("getStatus parses STATUS_WAIT_RETRY with code", async () => {
      mock.onGet("").reply(200, "STATUS_WAIT_RETRY:112233");
      const res = await client.getStatus(1234);
      expect(res).toEqual({ status: "STATUS_WAIT_RETRY", code: "112233" });
    });

    it("getStatus parses waiting states", async () => {
      mock.onGet("").reply(200, "STATUS_WAIT_CODE");
      expect(await client.getStatus(1234)).toEqual({ status: "STATUS_WAIT_CODE" });

      mock.onGet("").reply(200, "STATUS_WAIT_RESEND");
      expect(await client.getStatus(1234)).toEqual({ status: "STATUS_WAIT_RESEND" });

      mock.onGet("").reply(200, "STATUS_CANCEL");
      expect(await client.getStatus(1234)).toEqual({ status: "STATUS_CANCEL" });
    });

    it("getStatusV2 returns rich status structure", async () => {
      const v2Response = {
        verificationType: 1,
        sms: { dateTime: "2026-11-11 12:05:00", code: "1234", text: "Code: 1234" },
        call: { from: "", text: "", code: "", dateTime: "", url: "", parsingCount: 0 },
      };
      mock.onGet("").reply(200, v2Response);

      const res = await client.getStatusV2(1234);
      expect(res).toEqual(v2Response);
    });
  });

  describe("Catalogs and directories", () => {
    it("getCountries returns dictionary of countries", async () => {
      const data = {
        "0": { id: 0, rus: "Россия", eng: "Russia", chn: "俄罗斯", visible: 1, retry: 1 },
      };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getCountries");
        return [200, data];
      });

      const res = await client.getCountries();
      expect(res["0"].eng).toBe("Russia");
    });

    it("getServicesList returns available services", async () => {
      const data = {
        status: "success",
        services: [{ code: "tg", name: "Telegram" }],
      };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getServicesList");
        expect(config.params.country).toBe(0);
        expect(config.params.lang).toBe("en");
        return [200, data];
      });

      const res = await client.getServicesList({ country: 0, lang: "en" });
      expect(res.services[0].code).toBe("tg");
    });

    it("getOperators returns country operators", async () => {
      const data = {
        status: "success",
        countryOperators: { "0": ["mts", "beeline"] },
      };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getOperators");
        expect(config.params.country).toBe(0);
        return [200, data];
      });

      const res = await client.getOperators(0);
      expect(res.countryOperators["0"]).toContain("mts");
    });

    it("getPrices returns price matrix", async () => {
      const data = {
        "0": { tg: { cost: 15, count: 100, physicalCount: 50 } },
      };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getPrices");
        expect(config.params.country).toBe(0);
        expect(config.params.service).toBe("tg");
        return [200, data];
      });

      const res = await client.getPrices({ country: 0, service: "tg" });
      expect(res["0"]["tg"].cost).toBe(15);
    });

    it("getActiveActivations returns activations list", async () => {
      const data = {
        status: "success",
        data: [
          {
            activationId: "123",
            serviceCode: "tg",
            phoneNumber: "79001234567",
            activationCost: 10,
            activationStatus: "4",
            smsCode: null,
            smsText: null,
            activationTime: "2026-11-11 12:00:00",
            discount: "0",
            repeated: "0",
            countryCode: "0",
            countryName: "Russia",
            canGetAnotherSms: "1",
            currency: "643",
          },
        ],
      };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getActiveActivations");
        expect(config.params.start).toBe(0);
        expect(config.params.limit).toBe(10);
        return [200, data];
      });

      const res = await client.getActiveActivations({ start: 0, limit: 10 });
      expect(res.data[0].activationId).toBe("123");
    });

    it("getHistory returns activation history", async () => {
      const data = [
        {
          id: "1",
          date: "2026-11-11 12:00:00",
          phone: "79001112233",
          sms: "Code: 1234",
          cost: 15,
          status: "6",
          currency: 643,
        },
      ];
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getHistory");
        expect(config.params.size).toBe(5);
        return [200, data];
      });

      const res = await client.getHistory({ size: 5 });
      expect(res[0].id).toBe("1");
    });

    it("getTopCountriesByService and getTopCountriesByServiceRank", async () => {
      const data = [
        {
          country: 0,
          price: 15,
          count: 100,
          retail_price: 15,
          physicalTotalCount: 50,
          physicalCountForDefaultPrice: 50,
          physicalPriceMap: {},
        },
      ];

      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getTopCountriesByService");
        return [200, data];
      });
      const top1 = await client.getTopCountriesByService({ service: "tg", freePrice: true });
      expect(top1[0].country).toBe(0);

      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getTopCountriesByServiceRank");
        return [200, data];
      });
      const top2 = await client.getTopCountriesByServiceRank({ service: "tg" });
      expect(top2[0].country).toBe(0);
    });
  });

  describe("Reactivation, SMS, and Lifecycle", () => {
    it("reactivate and getReactivationPrice", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("reactivate");
        expect(config.params.id).toBe(123);
        return [200, { activationId: "123", phoneNumber: "79001112233" }];
      });
      const r1 = await client.reactivate(123);
      expect(r1.activationId).toBe("123");

      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("reactivationPrice");
        expect(config.params.id).toBe(123);
        return [200, { data: { price: 5, currency: 643 } }];
      });
      const r2 = await client.getReactivationPrice(123);
      expect(r2.data.price).toBe(5);
    });

    it("getAllSms returns SMS list", async () => {
      const data = {
        data: [{ id: "1", phoneFrom: "Service", code: "9988", text: "SMS 9988", service: "tg", date: "now", type: "sms" }],
        meta: { total: 1, service: "tg" },
      };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getAllSms");
        expect(config.params.id).toBe(123);
        expect(config.params.size).toBe(10);
        expect(config.params.page).toBe(1);
        return [200, data];
      });

      const res = await client.getAllSms({ id: 123, size: 10, page: 1 });
      expect(res.data[0].code).toBe("9988");
    });

    it("finishActivation and cancelActivation", async () => {
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("finishActivation");
        expect(config.params.id).toBe(123);
        return [200, "ACCESS_ACTIVATION"];
      });
      await expect(client.finishActivation(123)).resolves.toBeUndefined();

      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("cancelActivation");
        expect(config.params.id).toBe(123);
        return [200, "ACCESS_CANCEL"];
      });
      await expect(client.cancelActivation(123)).resolves.toBeUndefined();
    });
  });

  describe("Rental methods", () => {
    it("getRentPrices", async () => {
      const data = { "0": { "4": { price: 20, count: 10 } } };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("serviceCountRent");
        expect(config.params.service).toBe("tg");
        expect(config.params.country).toBe(0);
        return [200, data];
      });

      const res = await client.getRentPrices({ service: "tg", country: 0 });
      expect(res["0"]["4"].price).toBe(20);
    });

    it("getRentServicesAndCountries", async () => {
      const data = {
        operators: { mts: "MTS" },
        services: { tg: { quantity: 5, price: 20, retail_price: 20 } },
      };
      mock.onGet("").reply((config) => {
        expect(config.params.action).toBe("getRentServicesAndCountries");
        expect(config.params.country).toBe(0);
        expect(config.params.duration).toBe(4);
        return [200, data];
      });

      const res = await client.getRentServicesAndCountries({ country: 0, duration: 4 });
      expect(res.services.tg.quantity).toBe(5);
    });
  });

  describe("Error handling", () => {
    it("throws NoNumbersError for NO_NUMBERS", async () => {
      mock.onGet("").reply(200, "NO_NUMBERS");
      await expect(client.getBalance()).rejects.toThrow(NoNumbersError);
    });

    it("throws AuthenticationError for BAD_KEY or NO_KEY", async () => {
      mock.onGet("").reply(200, "BAD_KEY");
      await expect(client.getBalance()).rejects.toThrow(AuthenticationError);

      mock.onGet("").reply(200, "NO_KEY");
      await expect(client.getBalance()).rejects.toThrow(AuthenticationError);
    });

    it("throws ActivationNotFoundError for NO_ACTIVATION", async () => {
      mock.onGet("").reply(200, "NO_ACTIVATION");
      await expect(client.getStatus(999)).rejects.toThrow(ActivationNotFoundError);
    });

    it("throws EarlyCancelError for EARLY_CANCEL_DENIED", async () => {
      mock.onGet("").reply(200, "EARLY_CANCEL_DENIED");
      await expect(client.cancel(999)).rejects.toThrow(EarlyCancelError);
    });

    it("throws WrongMaxPriceError for WRONG_MAX_PRICE:<min>", async () => {
      mock.onGet("").reply(200, "WRONG_MAX_PRICE:12.75");
      await expect(client.getNumber({ service: "tg", country: 0 })).rejects.toThrow(WrongMaxPriceError);
    });

    it("throws BannedError for BANNED:<time>", async () => {
      mock.onGet("").reply(200, "BANNED:2026-12-31 23:59:59");
      await expect(client.getBalance()).rejects.toThrow(BannedError);
    });

    it("throws AccountInactiveError for ACCOUNT_INACTIVE", async () => {
      mock.onGet("").reply(200, "ACCOUNT_INACTIVE");
      await expect(client.getBalance()).rejects.toThrow(AccountInactiveError);
    });

    it("throws ChannelsLimitError for CHANNELS_LIMIT", async () => {
      mock.onGet("").reply(200, "CHANNELS_LIMIT");
      await expect(client.getBalance()).rejects.toThrow(ChannelsLimitError);
    });

    it("throws NoBalanceError for NO_BALANCE", async () => {
      mock.onGet("").reply(200, "NO_BALANCE");
      await expect(client.getNumber({ service: "tg", country: 0 })).rejects.toThrow(NoBalanceError);
    });

    it("throws HeroSMSError for BAD_ACTION or other standard error codes", async () => {
      mock.onGet("").reply(200, "BAD_ACTION");
      await expect(client.getBalance()).rejects.toThrow(HeroSMSError);
    });

    it("handles structured JSON error responses", async () => {
      mock.onGet("").reply(200, {
        title: "WRONG_MAX_PRICE",
        details: "Max price is too low",
        info: { min: 18.5 },
      });
      await expect(client.getNumber({ service: "tg", country: 0 })).rejects.toThrow(WrongMaxPriceError);

      mock.onGet("").reply(200, {
        title: "BANNED",
        details: "Account banned",
        info: { readable_date: "2027-01-01" },
      });
      await expect(client.getBalance()).rejects.toThrow(BannedError);

      mock.onGet("").reply(200, {
        title: "CHANNELS_LIMIT",
        details: "Channels limit exceeded",
        info: { current_threads: 10, max_allowed: 10 },
      });
      await expect(client.getBalance()).rejects.toThrow(ChannelsLimitError);

      mock.onGet("").reply(200, {
        title: "CUSTOM_ERROR",
        details: "Detailed explanation of failure",
      });
      await expect(client.getBalance()).rejects.toThrow(ApiJsonError);
    });
  });
});
