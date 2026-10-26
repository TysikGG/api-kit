import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { GiveSms, PARTNER_KEY, GiveSmsError } from '../src/index.js';

describe('GiveSms', () => {
  let mock: MockAdapter;
  let client: GiveSms;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new GiveSms({ apiKey: 'test_api_key' });
  });

  afterEach(() => {
    mock.restore();
  });

  it('includes partner_key in outgoing requests', async () => {
    mock.onGet('/api/v1/').reply((config) => {
      expect(config.params?.partner_key).toBe(PARTNER_KEY);
      expect(config.params?.partner_key).toBe('pk_39579ba6dfd61e59');
      expect(config.params?.userkey).toBe('test_api_key');
      return [200, { status: 200, data: { balance: 150.5 } }];
    });

    const balance = await client.getBalance();
    expect(balance).toBe(150.5);
  });

  it('includes partner_key in handler requests', async () => {
    mock.onGet('/stubs/handler_api.php').reply((config) => {
      expect(config.params?.partner_key).toBe(PARTNER_KEY);
      expect(config.params?.partner_key).toBe('pk_39579ba6dfd61e59');
      expect(config.params?.api_key).toBe('test_api_key');
      return [200, 'ACCESS_BALANCE:77.50'];
    });

    const balance = await client.handlerGetBalance();
    expect(balance).toBe(77.5);
  });

  describe('getBalance', () => {
    it('returns balance successfully', async () => {
      mock.onGet('/api/v1/').reply(200, {
        status: 200,
        data: { balance: 250 },
      });

      const res = await client.getBalance();
      expect(res).toBe(250);
    });

    it('throws GiveSmsError when API returns error', async () => {
      mock.onGet('/api/v1/').reply(200, {
        status: 401,
        data: { msg: 'Invalid API key' },
      });

      await expect(client.getBalance()).rejects.toThrow(GiveSmsError);
    });
  });

  describe('getCount', () => {
    it('returns counts successfully', async () => {
      mock.onGet('/api/v1/').reply(200, {
        status: 200,
        data: { vk: 45, tg: 120 },
      });

      const res = await client.getCount({ country: 'kazakhstan' });
      expect(res).toEqual({ vk: 45, tg: 120 });
    });

    it('throws error when server responds with 500', async () => {
      mock.onGet('/api/v1/').reply(500, {
        status: 500,
        data: { msg: 'Internal error' },
      });

      await expect(client.getCount()).rejects.toThrow(GiveSmsError);
    });
  });

  describe('getNumber', () => {
    it('orders number successfully', async () => {
      mock.onGet('/api/v1/').reply(200, {
        status: 200,
        data: { id: 12345, number: '+77001234567' },
      });

      const res = await client.getNumber({ service: 'vk', country: 'kazakhstan' });
      expect(res).toEqual({ id: 12345, number: '+77001234567' });
    });

    it('throws error on missing number data', async () => {
      mock.onGet('/api/v1/').reply(200, {
        status: 200,
        data: {},
      });

      await expect(client.getNumber({ service: 'vk' })).rejects.toThrow(GiveSmsError);
    });
  });

  describe('getCode', () => {
    it('returns code successfully', async () => {
      mock.onGet('/api/v1/').reply(200, {
        status: 200,
        data: { code: '849201', status: 'OK' },
      });

      const res = await client.getCode(12345);
      expect(res.code).toBe('849201');
      expect(res.status).toBe('OK');
    });

    it('throws error on failure', async () => {
      mock.onGet('/api/v1/').reply(500, {
        status: 500,
        data: { msg: 'Activation expired' },
      });

      await expect(client.getCode(12345)).rejects.toThrow(GiveSmsError);
    });
  });

  describe('repeatCode and lifecycle methods', () => {
    it('calls repeatCode', async () => {
      mock.onGet('/api/v1/').reply(200, { status: 200, data: 'OK' });
      const res = await client.repeatCode(12345);
      expect(res).toBe(true);
    });

    it('calls cancelNumber', async () => {
      mock.onGet('/api/v1/').reply(200, { status: 200, data: 'OK' });
      const res = await client.cancelNumber(12345);
      expect(res).toBe(true);
    });

    it('calls banNumber', async () => {
      mock.onGet('/api/v1/').reply(200, { status: 200, data: 'OK' });
      const res = await client.banNumber(12345);
      expect(res).toBe(true);
    });

    it('calls getReactivationOptions', async () => {
      mock.onGet('/api/v1/').reply(200, { status: 200, data: { canReactivate: true } });
      const res = await client.getReactivationOptions(12345);
      expect(res).toEqual({ canReactivate: true });
    });

    it('calls reactivate', async () => {
      mock.onGet('/api/v1/').reply(200, { status: 200, data: { id: 12346 } });
      const res = await client.reactivate(12345);
      expect(res).toEqual({ id: 12346 });
    });

    it('calls getAll', async () => {
      mock.onGet('/api/v1/').reply(200, { status: 200, data: [] });
      const res = await client.getAll();
      expect(res).toEqual([]);
    });
  });

  describe('handler methods', () => {
    it('handlerGetNumbersStatus succeeds', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, JSON.stringify({ vk_0: 15 }));
      const res = await client.handlerGetNumbersStatus();
      expect(res).toEqual({ vk_0: 15 });
    });

    it('handlerGetNumber succeeds', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, 'ACCESS_NUMBER:998877:77005554433');
      const res = await client.handlerGetNumber({ service: 'vk' });
      expect(res).toEqual({ id: '998877', number: '77005554433' });
    });

    it('handlerGetNumber handles error', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, 'NO_NUMBERS');
      await expect(client.handlerGetNumber({ service: 'vk' })).rejects.toThrow(GiveSmsError);
    });

    it('handlerSetStatus succeeds', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, 'ACCESS_READY');
      const res = await client.handlerSetStatus('998877', 1);
      expect(res).toBe('ACCESS_READY');
    });

    it('handlerGetStatus succeeds with code', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, 'STATUS_OK:4321');
      const res = await client.handlerGetStatus('998877');
      expect(res).toEqual({ status: 'STATUS_OK', code: '4321' });
    });

    it('handlerGetPrices succeeds', async () => {
      mock.onGet('/stubs/handler_api.php').reply(200, JSON.stringify({ '2': { vk: { cost: 10, count: 5 } } }));
      const res = await client.handlerGetPrices();
      expect(res).toEqual({ '2': { vk: { cost: 10, count: 5 } } });
    });
  });
});
