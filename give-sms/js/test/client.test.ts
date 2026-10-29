import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  Activation,
  ApiStatus401Error,
  COUNTRIES,
  GiveSms,
  GiveSmsAbortError,
  GiveSmsError,
  GiveSmsTimeoutError,
  NetworkError,
  NoNumbersError,
  PARTNER_KEY,
  PriceChangedError,
  ResendRequiredError,
  SERVICES,
  WrongMaxPriceError,
  findCountry,
} from '../src/index.js';

function paramsOf(config: { params?: Record<string, unknown> }): Record<string, unknown> {
  return config.params ?? {};
}

describe('GiveSms', () => {
  let mock: MockAdapter;
  let client: GiveSms;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new GiveSms({ apiKey: 'test_api_key', retryDelayMs: 0 });
  });

  afterEach(() => {
    mock.restore();
  });

  it('requires an API key and keeps the partner key', () => {
    expect(() => new GiveSms({ apiKey: '' })).toThrow(GiveSmsError);
    expect(() => new GiveSms('')).toThrow(GiveSmsError);
    expect(PARTNER_KEY).toBe('pk_39579ba6dfd61e59');
  });

  it('parses a proxy URL onto the axios instance', () => {
    const proxied = new GiveSms({
      apiKey: 'k',
      proxy: 'http://user:p%40ss@127.0.0.1:8080',
      baseUrl: 'https://give-sms.com/',
      headers: { 'X-Test': '1' },
    });
    const defaults = (proxied as unknown as { client: { defaults: { proxy: unknown; headers: Record<string, string>; baseURL: string } } }).client.defaults;
    expect(defaults.proxy).toEqual({
      protocol: 'http',
      host: '127.0.0.1',
      port: 8080,
      auth: { username: 'user', password: 'p@ss' },
    });
    expect(defaults.baseURL).toBe('https://give-sms.com');
    expect(defaults.headers['X-Test']).toBe('1');
    expect(() => new GiveSms({ apiKey: 'k', proxy: 'not a url' })).toThrow(/Invalid proxy URL/);
    const httpsProxy = new GiveSms({ apiKey: 'k', proxy: 'https://proxy.example' });
    const httpsDefaults = (httpsProxy as unknown as { client: { defaults: { proxy: { port: number } } } }).client.defaults;
    expect(httpsDefaults.proxy.port).toBe(443);
  });

  it('sends partner_key on native and handler calls', async () => {
    mock.onGet('/api/v1/').reply((config) => {
      expect(paramsOf(config).partner_key).toBe(PARTNER_KEY);
      expect(paramsOf(config).userkey).toBe('test_api_key');
      expect(paramsOf(config).method).toBe('getbalance');
      return [200, { status: 200, data: { balance: 150.5 } }];
    });
    await expect(client.getBalance()).resolves.toBe(150.5);

    mock.onGet('/stubs/handler_api.php').reply((config) => {
      expect(paramsOf(config).partner_key).toBe(PARTNER_KEY);
      expect(paramsOf(config).api_key).toBe('test_api_key');
      return [200, 'ACCESS_BALANCE:77.50'];
    });
    await expect(client.handlerGetBalance()).resolves.toBe(77.5);
  });

  describe('native API', () => {
    it('reads balance from several shapes, including zero', async () => {
      mock.onGet('/api/v1/').replyOnce(200, { status: 1, data: { user_balance: '0' } });
      await expect(client.getBalance()).resolves.toBe(0);
      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: 12 });
      await expect(client.getBalance()).resolves.toBe(12);
      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: { extra: true } });
      await expect(client.getBalance()).rejects.toThrow(/Missing balance/);
      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: { balance: 'nope' } });
      await expect(client.getBalance()).rejects.toThrow(/Invalid balance/);
    });

    it('maps native error statuses onto error classes', async () => {
      mock.onGet('/api/v1/').reply(200, { status: 401, data: { msg: 'Invalid API key' } });
      await expect(client.getBalance()).rejects.toBeInstanceOf(ApiStatus401Error);
      mock.reset();
      mock.onGet('/api/v1/').reply(200, { status: 599, msg: 'odd' });
      await expect(client.getBalance()).rejects.toBeInstanceOf(GiveSmsError);
      mock.reset();
      mock.onGet('/api/v1/').reply(200, 'nope');
      await expect(client.getBalance()).rejects.toThrow(/Invalid JSON/);
    });

    it('retries retryable statuses and network errors, then gives up', async () => {
      const retrying = new GiveSms({ apiKey: 'test_api_key', retries: 1, retryDelayMs: 0 });
      mock.onGet('/api/v1/').replyOnce(200, { status: 502, data: { msg: 'again' } });
      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: { balance: 3 } });
      await expect(retrying.getBalance()).resolves.toBe(3);

      mock.reset();
      mock.onGet('/api/v1/').reply(200, { status: 401, data: { msg: 'no' } });
      await expect(retrying.getBalance()).rejects.toBeInstanceOf(ApiStatus401Error);

      const custom = new GiveSms({
        apiKey: 'test_api_key',
        retries: 1,
        retryDelayMs: 0,
        retryOn: [500],
      });
      mock.reset();
      mock.onGet('/api/v1/').replyOnce(200, { status: 500, data: { msg: 'db' } });
      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: { balance: 4 } });
      await expect(custom.getBalance()).resolves.toBe(4);

      mock.reset();
      mock.onGet('/api/v1/').networkErrorOnce();
      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: { balance: 8 } });
      const networked = new GiveSms({ apiKey: 'test_api_key', retries: 1, retryDelayMs: 0 });
      await expect(networked.getBalance()).resolves.toBe(8);
      mock.reset();
      mock.onGet('/api/v1/').networkError();
      await expect(client.getBalance()).rejects.toBeInstanceOf(NetworkError);
      mock.reset();
      mock.onGet('/api/v1/').timeout();
      await expect(client.getBalance()).rejects.toBeInstanceOf(GiveSmsTimeoutError);
    });

    it('loads counts and the all-country catalog', async () => {
      mock.onGet('/api/v1/').reply((config) => {
        const params = paramsOf(config);
        if (params.method === 'getcount') {
          expect(params.country).toBe('kazakhstan');
          expect(params.operator).toBe('ANY');
          return [200, { status: 200, data: { ANY: { vk: { count: 1, price: '5' } } } }];
        }
        expect(params.method).toBe('getallcount');
        if (params.service !== undefined) {
          expect(params.service).toBe('tg');
        }
        return [200, { kazakhstan: { price: '1', count_all: '2' } }];
      });
      await expect(client.getCount({ country: 'kazakhstan', operator: 'ANY' })).resolves.toEqual({
        ANY: { vk: { count: 1, price: '5' } },
      });
      await expect(client.getAll({ service: 'tg' })).resolves.toEqual({
        kazakhstan: { price: '1', count_all: '2' },
      });
      await expect(client.getAllCount()).resolves.toEqual({
        kazakhstan: { price: '1', count_all: '2' },
      });
      mock.reset();
      mock.onGet('/api/v1/').reply(200, { status: 200, data: [] });
      await expect(client.getCount()).rejects.toThrow(/Unexpected getcount/);
    });

    it('orders a number from order_id/phone and from legacy id/number', async () => {
      mock.onGet('/api/v1/').replyOnce(200, {
        status: 200,
        data: { order_id: '377', phone: '79969817867', start_time: '2023-02-23T13:11:57.373Z' },
      });
      const ordered = await client.getNumber({
        service: 'vk',
        country: 'kazakhstan',
        operator: 'ANY',
        maxPrice: 10,
      });
      expect(ordered).toMatchObject({
        id: '377',
        number: '79969817867',
        phone: '79969817867',
        orderId: '377',
        startTime: '2023-02-23T13:11:57.373Z',
      });

      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: { id: 5, number: '7700' } });
      await expect(client.getNumber({ service: 'tg', country: 0, maxPrice: 0 })).resolves.toMatchObject({
        id: 5,
        number: '7700',
      });
      await expect(client.getNumber({ service: '' })).rejects.toThrow(/service is required/);
      mock.onGet('/api/v1/').replyOnce(200, { status: 200, data: {} });
      await expect(client.getNumber({ service: 'vk' })).rejects.toThrow(/Incomplete number/);
      mock.onGet('/api/v1/').replyOnce(200, {
        status: 500,
        data: { msg: 'По данному запросу номер телефона не найден.' },
      });
      await expect(client.getNumber({ service: 'vk' })).rejects.toThrow(/не найден/);
    });

    it('returns WAIT for status 400 and the SMS payload on success', async () => {
      mock.onGet('/api/v1/').replyOnce(200, {
        status: 400,
        data: { msg: 'Смс еще не найдено', advice: 'повторите' },
      });
      await expect(client.getCode(377)).resolves.toMatchObject({
        status: 'WAIT',
        message: 'Смс еще не найдено',
        advice: 'повторите',
      });

      mock.onGet('/api/v1/').replyOnce(200, {
        status: 200,
        data: {
          code: '753455',
          fullSms: 'code 753455',
          phone: '7996',
          receivedDate: '2023-02-23T13:18:57.373Z',
          sender: 'VK',
          id: 'sms-1',
          phonePass: 'secret',
        },
      });
      const sms = await client.getCode('377');
      expect(sms).toMatchObject({
        status: 'OK',
        code: '753455',
        fullSms: 'code 753455',
        smsId: 'sms-1',
        phonePass: 'secret',
      });

      mock.onGet('/api/v1/').replyOnce(500, { status: 500, data: { msg: 'expired' } });
      await expect(client.getCode(1)).rejects.toThrow(/expired/);
    });

    it('requests another code, cancels, bans, and reactivates', async () => {
      const seen: string[] = [];
      mock.onGet('/api/v1/').reply((config) => {
        const params = paramsOf(config);
        seen.push(String(params.method));
        if (params.method === 'wrongcode') {
          expect(params.order_id).toBe(377);
          expect(params.last_id === 'sms-1' || params.last_id === 377).toBe(true);
          return [200, { status: 200, data: { code: '222', id: 'sms-2' } }];
        }
        if (params.method === 'reactivationoptions') {
          return [200, { status: 200, data: { order_id: '377', options: [{ duration: 20, price: 12.6 }] } }];
        }
        if (params.method === 'reactivation') {
          if (params.duration !== undefined) {
            expect(params.duration).toBe(20);
            expect(params.price).toBe(12.6);
          }
          return [200, { status: 200, data: { order_id: '900', phone: '7996', duration: 20, price: 12.6 } }];
        }
        return [200, { status: 200, data: { msg: 'ok' } }];
      });

      await expect(client.repeatCode(377, 'sms-1')).resolves.toBe(true);
      await expect(client.wrongCode(377)).resolves.toMatchObject({ code: '222' });
      await expect(client.cancelNumber(377)).resolves.toBe(true);
      await expect(client.refuseNumber(377)).resolves.toBe(true);
      await expect(client.banNumber(377)).resolves.toBe(true);
      await expect(client.reactivationOptions(377)).resolves.toMatchObject({
        options: [{ duration: 20, price: 12.6 }],
      });
      await expect(client.getReactivationOptions(377)).resolves.toMatchObject({ order_id: '377' });
      await expect(client.reactivate(377, { duration: 20, price: 12.6 })).resolves.toMatchObject({
        order_id: '900',
      });
      await expect(client.reactivate(377)).resolves.toMatchObject({ order_id: '900' });
      expect(seen).toEqual([
        'wrongcode',
        'wrongcode',
        'refusenumber',
        'refusenumber',
        'bannumber',
        'reactivationoptions',
        'reactivationoptions',
        'reactivation',
        'reactivation',
      ]);

      mock.reset();
      mock.onGet('/api/v1/').reply(200, {
        status: 507,
        data: { msg: 'price changed', reason: 'price_changed' },
      });
      const error = await client.reactivate(1, { duration: 20, price: 1 }).catch((err: unknown) => err);
      expect(error).toBeInstanceOf(GiveSmsError);
      expect((error as GiveSmsError).reason).toBe('price_changed');
      expect((error as GiveSmsError).code).toBe(507);
    });

    it('polls until a code arrives, times out, and aborts', async () => {
      let calls = 0;
      mock.onGet('/api/v1/').reply(() => {
        calls += 1;
        if (calls === 1) {
          return [200, { status: 400, data: { msg: 'wait' } }];
        }
        return [200, { status: 200, data: { code: '999', status: 'SUCCESS' } }];
      });
      await expect(client.waitForCode(7, { timeoutMs: 1000, intervalMs: 10 })).resolves.toMatchObject({
        code: '999',
        status: 'SUCCESS',
      });

      mock.reset();
      mock.onGet('/api/v1/').reply(200, { status: 400, data: { msg: 'wait' } });
      await expect(client.waitForNextCode(7, 7, { timeoutMs: 0, intervalMs: 0 })).rejects.toBeInstanceOf(
        GiveSmsTimeoutError,
      );

      const controller = new AbortController();
      controller.abort();
      await expect(client.waitForCode(7, { signal: controller.signal, timeoutMs: 1000 })).rejects.toBeInstanceOf(
        GiveSmsAbortError,
      );

      const later = new AbortController();
      mock.reset();
      mock.onGet('/api/v1/').reply(() => {
        setTimeout(() => later.abort(), 5);
        return [200, { status: 400, data: { msg: 'wait' } }];
      });
      await expect(
        client.waitForCode(7, { signal: later.signal, timeoutMs: 2000, intervalMs: 40 }),
      ).rejects.toBeInstanceOf(GiveSmsAbortError);
    });

    it('exposes a bound activation helper', async () => {
      mock.onGet('/api/v1/').reply((config) => {
        const method = paramsOf(config).method;
        if (method === 'getnumber') {
          return [200, { status: 200, data: { order_id: 3, phone: '700', start_time: 't' } }];
        }
        if (method === 'getcode') {
          return [200, { status: 200, data: { code: '1' } }];
        }
        return [200, { status: 200, data: { msg: 'ok' } }];
      });
      const activation = await client.purchase({ service: 'wa' });
      expect(activation).toBeInstanceOf(Activation);
      expect(activation.number).toBe('700');
      expect(activation.startTime).toBe('t');
      await expect(activation.getCode()).resolves.toMatchObject({ code: '1' });
      await expect(activation.waitForCode({ timeoutMs: 1000, intervalMs: 0 })).resolves.toMatchObject({
        code: '1',
      });
      await expect(activation.wrongCode('sms')).resolves.toMatchObject({ status: 'OK' });
      await expect(activation.repeatCode()).resolves.toBe(true);
      await expect(activation.cancel()).resolves.toBe(true);
      await expect(activation.ban()).resolves.toBe(true);
    });
  });

  describe('handler API', () => {
    it('covers status, prices, orders, and reactivation', async () => {
      mock.onGet('/stubs/handler_api.php').reply((config) => {
        const params = paramsOf(config);
        if (params.action === 'getNumbersStatus') {
          expect(params.country).toBe(2);
          return [200, JSON.stringify({ vk_0: 15 })];
        }
        if (params.action === 'getNumber') {
          expect(params.maxPrice).toBe(9);
          return [200, 'ACCESS_NUMBER:998877:77005554433'];
        }
        if (params.action === 'setStatus') {
          return [200, params.status === 1 ? 'ACCESS_READY' : `ACCESS_${params.status}`];
        }
        if (params.action === 'getStatus') {
          return [200, 'STATUS_OK:4321'];
        }
        if (params.action === 'getPrices') {
          expect(params.tiers).toBe(1);
          return [200, JSON.stringify({ '2': { vk: { '10': 5 } } })];
        }
        if (params.action === 'getReactivationOptions') {
          return [200, JSON.stringify({ '20': 12.6 })];
        }
        if (params.action === 'reactivation') {
          expect(params.duration).toBe(20);
          return [200, 'ACCESS_NUMBER:42:7900'];
        }
        return [200, 'NO_ACTION'];
      });

      await expect(client.handlerGetNumbersStatus({ country: 2, operator: 'any' })).resolves.toEqual({
        vk_0: 15,
      });
      await expect(
        client.handlerGetNumber({ service: 'vk', country: 2, operator: 'mts', maxPrice: 9 }),
      ).resolves.toMatchObject({ id: '998877', number: '77005554433' });
      await expect(client.handlerSetStatus('998877', 1)).resolves.toBe('ACCESS_READY');
      await expect(client.handlerReady(1)).resolves.toBe('ACCESS_READY');
      await expect(client.handlerRequestAnotherSms(1)).resolves.toBe('ACCESS_3');
      await expect(client.handlerComplete(1)).resolves.toBe('ACCESS_6');
      await expect(client.handlerCancel(1)).resolves.toBe('ACCESS_8');
      await expect(client.handlerGetStatus('998877')).resolves.toMatchObject({
        status: 'STATUS_OK',
        code: '4321',
      });
      await expect(client.handlerGetPrices({ country: 2, service: 'vk', tiers: 1 })).resolves.toEqual({
        '2': { vk: { '10': 5 } },
      });
      await expect(client.handlerGetReactivationOptions(1)).resolves.toEqual({ '20': 12.6 });
      await expect(client.handlerReactivate(1, 20, 12.6)).resolves.toMatchObject({ id: '42', number: '7900' });
    });

    it('parses handler statuses and throws handler errors', async () => {
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'STATUS_WAIT_RETRY:111');
      await expect(client.handlerGetStatus(1)).resolves.toMatchObject({
        status: 'STATUS_WAIT_RETRY',
        code: '111',
      });
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'STATUS_WAIT_CODE');
      await expect(client.handlerGetStatus(1)).resolves.toMatchObject({ status: 'STATUS_WAIT_CODE' });

      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'NO_NUMBERS');
      await expect(client.handlerGetNumber({ service: 'vk' })).rejects.toBeInstanceOf(NoNumbersError);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'WRONG_MAX_PRICE:1.5');
      const error = await client.handlerGetNumber({ service: 'vk' }).catch((err: unknown) => err);
      expect(error).toBeInstanceOf(WrongMaxPriceError);
      expect((error as WrongMaxPriceError).responseData).toBe('1.5');
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'PRICE_CHANGED');
      await expect(client.handlerReactivate(1, 20)).rejects.toBeInstanceOf(PriceChangedError);

      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'ACCESS_READY');
      await expect(client.handlerGetNumber({ service: 'vk' })).rejects.toThrow(/Failed to order number/);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'ACCESS_NUMBER:only');
      await expect(client.handlerGetNumber({ service: 'vk' })).rejects.toThrow(/Malformed ACCESS_NUMBER/);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'ACCESS_NUMBER::7900');
      await expect(client.handlerGetNumber({ service: 'vk' })).rejects.toThrow(/Malformed ACCESS_NUMBER/);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'NOPE');
      await expect(client.handlerGetBalance()).rejects.toThrow(/Unexpected balance/);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'ACCESS_BALANCE:nope');
      await expect(client.handlerGetBalance()).rejects.toThrow(/Invalid balance format/);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, 'not-json');
      await expect(client.handlerGetPrices()).rejects.toThrow(/Invalid JSON/);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, '[]');
      await expect(client.handlerGetNumbersStatus()).rejects.toThrow(/Unexpected getNumbersStatus/);
      mock.onGet('/stubs/handler_api.php').replyOnce(200, '[]');
      await expect(client.handlerGetReactivationOptions(1)).rejects.toThrow(/Unexpected reactivation/);
      await expect(client.handlerGetNumber({ service: '' })).rejects.toThrow(/service is required/);
      mock.onGet('/stubs/handler_api.php').replyOnce(500, '');
      await expect(client.handlerGetBalance()).rejects.toThrow(/HTTP 500/);
    });

    it('waits for a handler code and stops on cancel or resend', async () => {
      let calls = 0;
      mock.onGet('/stubs/handler_api.php').reply(() => {
        calls += 1;
        return [200, calls === 1 ? 'STATUS_WAIT_CODE' : 'STATUS_OK:55'];
      });
      await expect(client.handlerWaitForCode(1, { timeoutMs: 1000, intervalMs: 0 })).resolves.toMatchObject({
        status: 'STATUS_OK',
        code: '55',
      });

      mock.reset();
      mock.onGet('/stubs/handler_api.php').reply(200, 'STATUS_CANCEL');
      await expect(client.handlerWaitForCode(1, { timeoutMs: 1000, intervalMs: 0 })).rejects.toMatchObject({
        code: 'STATUS_CANCEL',
      });
      mock.reset();
      mock.onGet('/stubs/handler_api.php').reply(200, 'STATUS_WAIT_RESEND');
      await expect(client.handlerWaitForCode(1, { timeoutMs: 1000, intervalMs: 0 })).rejects.toBeInstanceOf(
        ResendRequiredError,
      );
      mock.reset();
      mock.onGet('/stubs/handler_api.php').reply(200, 'STATUS_WAIT_RETRY:1');
      await expect(client.handlerWaitForCode(1, { timeoutMs: 0, intervalMs: 0 })).rejects.toBeInstanceOf(
        GiveSmsTimeoutError,
      );
    });
  });

  describe('rent API', () => {
    it('lists, orders, reads, prolongs, and waits', async () => {
      mock.onGet('/api/v2/rent/rent_number.php').reply((config) => {
        const params = paramsOf(config);
        expect(params.partner_key).toBe(PARTNER_KEY);
        expect(params.userkey).toBe('test_api_key');
        if (params.method === 'countries') {
          return [200, { status: 200, data: { countries: [{ code: 'KZ' }], count: 1 } }];
        }
        if (params.method === 'getdatacountry') {
          expect(params.country).toBe('KZ');
          return [200, { status: 200, data: { services: [] } }];
        }
        if (params.method === 'allorders') {
          return [200, { status: 200, data: { orders: [], count: 0 } }];
        }
        if (params.method === 'createorder') {
          expect(params.services).toBe('82,1');
          expect(params.type).toBe('week');
          return [
            200,
            {
              status: 200,
              data: {
                order_id: 123,
                phone: '79991234567',
                country_code: '+7',
                end_time: '18.02.2026 14:30',
                end_time_timestamp: 10,
                start_timestamp: 1,
                orders_count: 1,
                order_ids: [123],
              },
            },
          ];
        }
        if (params.method === 'getsms') {
          return [
            200,
            {
              status: 200,
              data: {
                msg: 'Список всех СМС',
                sms_list: [{ date: '2026-05-21', text: 'Ваш код: 123456', timestamp: 50 }],
              },
            },
          ];
        }
        expect(params.method).toBe('prolong');
        return [
          200,
          {
            status: 200,
            data: { msg: 'Аренда успешно продлена', order_id: 123, days: 7, price: 350, rent_at: 99, rent_at_formatted: 'later' },
          },
        ];
      });

      await expect(client.rentCountries()).resolves.toMatchObject({ count: 1 });
      await expect(client.rentGetDataCountry({ country: 'KZ' })).resolves.toEqual({ services: [] });
      await expect(client.rentAllOrders()).resolves.toMatchObject({ count: 0 });
      const order = await client.rentCreateOrder({
        type: 'week',
        period: 1,
        services: [82, 1],
        country: 'KZ',
        operator: 'ANY',
      });
      expect(order).toMatchObject({ orderId: 123, phone: '79991234567', ordersCount: 1 });
      const inbox = await client.rentGetSms(123);
      expect(inbox.messages[0]).toMatchObject({ text: 'Ваш код: 123456', timestamp: 50 });
      await expect(client.rentProlong({ rentId: 123, type: 'week', period: 1 })).resolves.toMatchObject({
        days: 7,
        price: 350,
      });
      await expect(client.rentWaitForSms(123, { timeoutMs: 1000, intervalMs: 0 })).resolves.toMatchObject({
        message: 'Список всех СМС',
      });
      await expect(client.rentWaitForSms(123, { timeoutMs: 1000, intervalMs: 0, since: 10 })).resolves.toMatchObject({
        messages: [{ timestamp: 50 }],
      });

      mock.reset();
      mock.onGet('/api/v2/rent/rent_number.php').reply(200, {
        status: 200,
        data: { msg: 'empty', sms_list: [] },
      });
      await expect(client.rentWaitForSms(1, { timeoutMs: 0, intervalMs: 0, since: 5 })).rejects.toBeInstanceOf(
        GiveSmsTimeoutError,
      );
      mock.reset();
      mock.onGet('/api/v2/rent/rent_number.php').reply(200, { status: 200, data: [] });
      await expect(client.rentCountries()).rejects.toThrow(/Unexpected countries/);
      mock.reset();
      mock.onGet('/api/v2/rent/rent_number.php').reply(200, { status: 200, data: {} });
      await expect(
        client.rentCreateOrder({ type: 'month', period: 1, services: '1', country: 'KZ' }),
      ).rejects.toThrow(/Incomplete rent order/);
      mock.reset();
      mock.onGet('/api/v2/rent/rent_number.php').reply(200, { status: 404, data: { msg: 'missing' } });
      await expect(client.rentGetSms(1)).rejects.toThrow(/missing/);
    });
  });

  it('resolves catalog entries', () => {
    expect(findCountry('Kazakhstan')?.info.handlerId).toBe(2);
    expect(findCountry(16)?.code).toBe('england');
    expect(findCountry('nope')).toBeUndefined();
    expect(findCountry('')).toBeUndefined();
    expect(COUNTRIES.kazakhstan.name).toBe('Казахстан');
    expect(SERVICES.tg).toBe('Telegram');
    expect(SERVICES.call).toContain('звонка');
  });
});
