import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  VakSmsClient,
  VakSmsError,
} from '../src/index.js';

describe('VakSmsClient', () => {
  let mock: MockAdapter;
  let client: VakSmsClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new VakSmsClient({ apiKey: 'test_token' });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('throws error if apiKey is empty', () => {
      expect(() => new VakSmsClient({ apiKey: '' })).toThrow(VakSmsError);
    });

    it('accepts string apiKey', () => {
      const c = new VakSmsClient('token_str');
      expect(c).toBeInstanceOf(VakSmsClient);
    });
  });

  describe('getBalance', () => {
    it('returns balance number on success', async () => {
      mock.onGet('https://vak-sms.com/api/getBalance/').reply((config) => {
        expect(config.params.apiKey).toBe('test_token');
        return [200, { balance: 154.5 }];
      });

      const balance = await client.getBalance();
      expect(balance).toBe(154.5);
    });

    it('throws VakSmsError when apiKeyNotFound error is returned', async () => {
      mock.onGet('https://vak-sms.com/api/getBalance/').reply(200, {
        error: 'apiKeyNotFound',
      });

      await expect(client.getBalance()).rejects.toThrow(VakSmsError);
      await expect(client.getBalance()).rejects.toMatchObject({
        code: 'apiKeyNotFound',
      });
    });
  });

  describe('getNumber', () => {
    it('requests number and returns tel and idNum', async () => {
      mock.onGet('https://vak-sms.com/api/getNumber/').reply((config) => {
        expect(config.params.apiKey).toBe('test_token');
        expect(config.params.service).toBe('tg');
        expect(config.params.country).toBe('ru');
        return [200, { tel: '79998887766', idNum: 'op_12345' }];
      });

      const res = await client.getNumber({
        service: 'tg',
        country: 'ru',
      });

      expect(res.tel).toBe('79998887766');
      expect(res.idNum).toBe('op_12345');
    });

    it('passes softId if configured', async () => {
      const clientWithSoft = new VakSmsClient({
        apiKey: 'test_token',
        softId: 'my_soft_123',
      });

      mock.onGet('https://vak-sms.com/api/getNumber/').reply((config) => {
        expect(config.params.softId).toBe('my_soft_123');
        return [200, { tel: '79998887766', idNum: 'op_12345' }];
      });

      const res = await clientWithSoft.getNumber({ service: 'tg' });
      expect(res.idNum).toBe('op_12345');
    });

    it('throws VakSmsError on noNumber error', async () => {
      mock.onGet('https://vak-sms.com/api/getNumber/').reply(200, {
        error: 'noNumber',
      });

      await expect(client.getNumber({ service: 'tg' })).rejects.toThrow(VakSmsError);
    });
  });

  describe('prolongNumber', () => {
    it('prolongs number on success', async () => {
      mock.onGet('https://vak-sms.com/api/prolongNumber/').reply((config) => {
        expect(config.params.service).toBe('tg');
        expect(config.params.tel).toBe('79998887766');
        return [200, { tel: '79998887766', idNum: 'op_prolonged' }];
      });

      const res = await client.prolongNumber('tg', '79998887766');
      expect(res.idNum).toBe('op_prolonged');
    });

    it('throws VakSmsError on failure', async () => {
      mock.onGet('https://vak-sms.com/api/prolongNumber/').reply(200, {
        error: 'noNumber',
      });

      await expect(client.prolongNumber('tg', '79998887766')).rejects.toThrow(
        VakSmsError,
      );
    });
  });

  describe('getSmsCode', () => {
    it('returns single code when available', async () => {
      mock.onGet('https://vak-sms.com/api/getSmsCode/').reply((config) => {
        expect(config.params.idNum).toBe('op_12345');
        return [200, { smsCode: '998877' }];
      });

      const code = await client.getSmsCode('op_12345');
      expect(code).toBe('998877');
    });

    it('returns null when code is not yet received', async () => {
      mock.onGet('https://vak-sms.com/api/getSmsCode/').reply(200, {
        smsCode: null,
      });

      const code = await client.getSmsCode('op_12345');
      expect(code).toBeNull();
    });

    it('throws VakSmsError on idNumNotFound', async () => {
      mock.onGet('https://vak-sms.com/api/getSmsCode/').reply(200, {
        error: 'idNumNotFound',
      });

      await expect(client.getSmsCode('invalid_id')).rejects.toThrow(VakSmsError);
    });
  });

  describe('setStatus', () => {
    it('sets status to end', async () => {
      mock.onGet('https://vak-sms.com/api/setStatus/').reply((config) => {
        expect(config.params.status).toBe('end');
        expect(config.params.idNum).toBe('op_12345');
        return [200, { status: 'update' }];
      });

      const status = await client.setStatus('op_12345', 'end');
      expect(status).toBe('update');
    });

    it('throws VakSmsError on badStatus', async () => {
      mock.onGet('https://vak-sms.com/api/setStatus/').reply(200, {
        error: 'badStatus',
      });

      await expect(client.setStatus('op_12345', 'bad')).rejects.toThrow(VakSmsError);
    });
  });

  describe('getCountNumber', () => {
    it('returns service count and price', async () => {
      mock.onGet('https://vak-sms.com/api/getCountNumber/').reply((config) => {
        expect(config.params.service).toBe('tg');
        return [200, { tg: 250, price: 15 }];
      });

      const count = await client.getCountNumber('tg', 'ru');
      expect(count.service).toBe('tg');
      expect(count.count).toBe(250);
      expect(count.price).toBe(15);
    });

    it('throws on noService error', async () => {
      mock.onGet('https://vak-sms.com/api/getCountNumber/').reply(200, {
        error: 'noService',
      });

      await expect(client.getCountNumber('invalid_srv')).rejects.toThrow(VakSmsError);
    });
  });

  describe('getCountryList', () => {
    it('returns array of countries and operators', async () => {
      mock.onGet('https://vak-sms.com/api/getCountryList/').reply(200, [
        { countryName: 'Russia', countryCode: 'ru', operatorList: ['megafon'] },
      ]);

      const list = await client.getCountryList();
      expect(list).toHaveLength(1);
      expect(list[0].countryCode).toBe('ru');
    });
  });

  describe('getCountNumbersList', () => {
    it('returns service inventory map', async () => {
      mock.onGet('https://vak-sms.com/api/getCountNumbersList/').reply(200, {
        tg: [{ count: 100, price: 10 }],
      });

      const list = await client.getCountNumbersList('ru');
      expect(list).toHaveProperty('tg');
    });
  });
});
