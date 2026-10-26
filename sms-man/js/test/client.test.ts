import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { SmsMan, DEFAULT_REF, SmsManError } from '../src/index.js';

describe('SmsMan', () => {
  let mock: MockAdapter;
  let client: SmsMan;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new SmsMan({ token: 'test_token' });
  });

  afterEach(() => {
    mock.restore();
  });

  it('includes ref parameter in getNumber and handlerGetNumber', async () => {
    mock.onGet('/control/get-number').reply((config) => {
      expect(config.params?.ref).toBe(DEFAULT_REF);
      expect(config.params?.ref).toBe('s_iNhkmN48Jf');
      expect(config.params?.token).toBe('test_token');
      expect(config.params?.country_id).toBe(1);
      expect(config.params?.application_id).toBe(1);
      return [200, { request_id: 12345, number: '+79001234567' }];
    });

    const order = await client.getNumber(1, 1);
    expect(order.requestId).toBe(12345);
    expect(order.number).toBe('+79001234567');

    mock.onGet('/stubs/handler_api.php').reply((config) => {
      expect(config.params?.ref).toBe(DEFAULT_REF);
      expect(config.params?.ref).toBe('s_iNhkmN48Jf');
      return [200, 'ACCESS_NUMBER:8877:79007654321'];
    });

    const handlerOrder = await client.handlerGetNumber(1, 'tg');
    expect(handlerOrder.id).toBe('8877');
    expect(handlerOrder.number).toBe('79007654321');
  });

  describe('getBalance', () => {
    it('returns balance successfully', async () => {
      mock.onGet('/control/get-balance').reply(200, { balance: '500.50' });
      const balance = await client.getBalance();
      expect(balance).toBe(500.50);
    });

    it('throws SmsManError on API error response', async () => {
      mock.onGet('/control/get-balance').reply(200, { success: false, error_code: 'wrong_token' });
      await expect(client.getBalance()).rejects.toThrow(SmsManError);
    });
  });

  describe('directory and metadata methods', () => {
    it('getLimits returns limits', async () => {
      mock.onGet('/control/limits').reply(200, { count: 100 });
      const limits = await client.getLimits(1, 1);
      expect(limits).toEqual({ count: 100 });
    });

    it('getPrices returns prices', async () => {
      mock.onGet('/control/get-prices').reply(200, { '1': 10 });
      const prices = await client.getPrices(1);
      expect(prices).toEqual({ '1': 10 });
    });

    it('getCountries returns countries', async () => {
      mock.onGet('/control/countries').reply(200, { '1': { title: 'Russia' } });
      const countries = await client.getCountries();
      expect(countries).toEqual({ '1': { title: 'Russia' } });
    });

    it('getApplications returns applications', async () => {
      mock.onGet('/control/applications').reply(200, { '1': { title: 'Telegram' } });
      const apps = await client.getApplications();
      expect(apps).toEqual({ '1': { title: 'Telegram' } });
    });
  });

  describe('order lifecycle', () => {
    it('getSms returns sms code', async () => {
      mock.onGet('/control/get-sms').reply(200, { sms_code: '123456' });
      const res = await client.getSms(12345);
      expect(res.smsCode).toBe('123456');
    });

    it('setStatus succeeds', async () => {
      mock.onGet('/control/set-status').reply(200, { success: true });
      const ok = await client.setStatus(12345, 'reject');
      expect(ok).toBe(true);
    });
  });

  describe('handler methods', () => {
    it('handlerGetBalance returns balance', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, 'ACCESS_BALANCE:100.00');
      const bal = await client.handlerGetBalance();
      expect(bal).toBe(100.00);
    });

    it('handlerGetStatus returns status and code', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, 'STATUS_OK:9876');
      const st = await client.handlerGetStatus(123);
      expect(st.status).toBe('STATUS_OK');
      expect(st.code).toBe('9876');
    });

    it('handlerSetStatus succeeds', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, 'ACCESS_READY');
      const res = await client.handlerSetStatus(123, 1);
      expect(res).toBe('ACCESS_READY');
    });

    it('handlerGetPrices succeeds', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, JSON.stringify({ '1': { tg: { cost: 10 } } }));
      const prices = await client.handlerGetPrices(1);
      expect(prices).toEqual({ '1': { tg: { cost: 10 } } });
    });
  });
});
