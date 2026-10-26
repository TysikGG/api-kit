import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  SmsBowerClient,
  SmsBowerError,
  DEFAULT_REF_ID,
} from '../src/index.js';

describe('SmsBowerClient', () => {
  let mock: MockAdapter;
  let client: SmsBowerClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new SmsBowerClient({ apiKey: 'test_token' });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('throws error if apiKey is missing', () => {
      expect(() => new SmsBowerClient({ apiKey: '' })).toThrow(SmsBowerError);
    });

    it('accepts a simple string token', () => {
      const c = new SmsBowerClient('simple_token');
      expect(c).toBeInstanceOf(SmsBowerClient);
    });
  });

  describe('getBalance', () => {
    it('returns parsed balance on success', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply((config) => {
        expect(config.params.api_key).toBe('test_token');
        expect(config.params.action).toBe('getBalance');
        return [200, 'ACCESS_BALANCE:14.25'];
      });

      const balance = await client.getBalance();
      expect(balance).toBe(14.25);
    });

    it('throws SmsBowerError on BAD_KEY error', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'BAD_KEY');

      await expect(client.getBalance()).rejects.toThrow(SmsBowerError);
      await expect(client.getBalance()).rejects.toMatchObject({
        code: 'BAD_KEY',
      });
    });

    it('throws SmsBowerError on invalid balance string', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'ACCESS_BALANCE:invalid');

      await expect(client.getBalance()).rejects.toThrow(SmsBowerError);
    });
  });

  describe('getNumber', () => {
    it('includes ref parameter and returns activation details', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply((config) => {
        expect(config.params.action).toBe('getNumber');
        expect(config.params.service).toBe('tg');
        expect(config.params.country).toBe('22');
        expect(config.params.ref).toBe(DEFAULT_REF_ID);
        expect(config.params.ref).toBe('572438');
        return [200, 'ACCESS_NUMBER:987654:+1234567890'];
      });

      const res = await client.getNumber({
        service: 'tg',
        country: '22',
      });

      expect(res.id).toBe('987654');
      expect(res.number).toBe('+1234567890');
    });

    it('throws SmsBowerError on NO_NUMBERS', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'NO_NUMBERS');

      await expect(
        client.getNumber({ service: 'tg', country: '22' }),
      ).rejects.toThrow(SmsBowerError);
    });
  });

  describe('getNumberV2', () => {
    it('includes ref parameter and returns full JSON details', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply((config) => {
        expect(config.params.action).toBe('getNumberV2');
        expect(config.params.service).toBe('wa');
        expect(config.params.ref).toBe(DEFAULT_REF_ID);
        return [
          200,
          JSON.stringify({
            activationId: 445566,
            phoneNumber: '18005550199',
            activationCost: 0.25,
            countryCode: 1,
          }),
        ];
      });

      const res = await client.getNumberV2({ service: 'wa' });
      expect(res.activationId).toBe(445566);
      expect(res.phoneNumber).toBe('18005550199');
      expect(res.activationCost).toBe(0.25);
    });

    it('throws SmsBowerError on error response', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'BAD_SERVICE');

      await expect(client.getNumberV2({ service: 'unknown' })).rejects.toThrow(
        SmsBowerError,
      );
    });
  });

  describe('getStatus', () => {
    it('returns STATUS_OK with sms code', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply((config) => {
        expect(config.params.action).toBe('getStatus');
        expect(config.params.id).toBe('123456');
        return [200, 'STATUS_OK:998877'];
      });

      const res = await client.getStatus('123456');
      expect(res.status).toBe('STATUS_OK');
      expect(res.code).toBe('998877');
    });

    it('returns STATUS_WAIT_CODE when pending', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'STATUS_WAIT_CODE');

      const res = await client.getStatus('123456');
      expect(res.status).toBe('STATUS_WAIT_CODE');
      expect(res.code).toBeUndefined();
    });

    it('throws SmsBowerError on NO_ACTIVATION', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'NO_ACTIVATION');

      await expect(client.getStatus('999999')).rejects.toThrow(SmsBowerError);
    });
  });

  describe('setStatus', () => {
    it('completes activation with status 6', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply((config) => {
        expect(config.params.action).toBe('setStatus');
        expect(config.params.id).toBe('123456');
        expect(config.params.status).toBe(6);
        return [200, 'ACCESS_ACTIVATION'];
      });

      const res = await client.setStatus('123456', 6);
      expect(res).toBe('ACCESS_ACTIVATION');
    });

    it('throws SmsBowerError on BAD_STATUS', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'BAD_STATUS');

      await expect(client.setStatus('123456', 99)).rejects.toThrow(SmsBowerError);
    });
  });

  describe('getPrices', () => {
    it('returns price mapping', async () => {
      const sample = {
        '22': {
          tg: { cost: 1.5, count: 500 },
        },
      };
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, JSON.stringify(sample));

      const prices = await client.getPrices('tg', '22');
      expect(prices['22'].tg.cost).toBe(1.5);
    });

    it('throws SmsBowerError on BAD_KEY', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, 'BAD_KEY');

      await expect(client.getPrices()).rejects.toThrow(SmsBowerError);
    });
  });

  describe('getServicesList', () => {
    it('returns list of services', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, JSON.stringify({
        status: 'success',
        services: [{ code: 'tg', name: 'Telegram' }],
      }));

      const services = await client.getServicesList();
      expect(services).toHaveLength(1);
      expect(services[0].code).toBe('tg');
    });
  });

  describe('getCountries', () => {
    it('returns countries dictionary', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, JSON.stringify({
        '22': { id: '22', eng: 'India', rus: 'Индия' },
      }));

      const countries = await client.getCountries();
      expect(countries['22'].eng).toBe('India');
    });
  });

  describe('getTopCountriesByService', () => {
    it('returns top countries structure', async () => {
      mock.onGet('https://smsbower.page/stubs/handler_api.php').reply(200, JSON.stringify({
        usa: { '3170': { price: 0.12, count: 542 } },
      }));

      const res = await client.getTopCountriesByService('tg');
      expect(res).toBeDefined();
    });
  });

  describe('getActualWalletAddress', () => {
    it('returns wallet address', async () => {
      mock.onGet('https://smsbower.page/api/payment/getActualWalletAddress').reply(200, {
        wallet_address: 'TFGMAwTfxtxKvy1mTTHr7XJaXeumjdmhGg',
      });

      const res = await client.getActualWalletAddress('usdt', 'tron');
      expect(res.wallet_address).toBe('TFGMAwTfxtxKvy1mTTHr7XJaXeumjdmhGg');
    });
  });
});
