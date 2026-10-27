import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  XmlStockClient,
  DEFAULT_SOFT_ID,
  XmlStockError,
} from '../src/index.js';

describe('XmlStockClient', () => {
  let mock: MockAdapter;
  let client: XmlStockClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new XmlStockClient({
      user: '12345',
      apiKey: 'test_api_key',
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('configuration and constants', () => {
    it('has the expected default soft_id', () => {
      expect(DEFAULT_SOFT_ID).toBe('7ee4fabf80ee75b2c5bfa100f8fe169f');
    });

    it('validates user is provided', () => {
      expect(() => new XmlStockClient({ user: '', apiKey: 'key' })).toThrow(XmlStockError);
    });

    it('validates apiKey is provided', () => {
      expect(() => new XmlStockClient({ user: '123', apiKey: '' })).toThrow(XmlStockError);
    });
  });

  describe('getBalance', () => {
    it('sends user, key, and soft_id and returns parsed balance', async () => {
      mock.onGet('/api/').reply((config) => {
        expect(config.params?.do).toBe('balance');
        expect(config.params?.user).toBe('12345');
        expect(config.params?.key).toBe('test_api_key');
        expect(config.params?.soft_id).toBe(DEFAULT_SOFT_ID);
        return [200, { balance: 154.5, currency: 'RUB' }];
      });

      const res = await client.getBalance();
      expect(res.balance).toBe(154.5);
      expect(res.currency).toBe('RUB');
    });

    it('handles JSON string response from getBalance', async () => {
      mock.onGet('/api/').reply(200, JSON.stringify({ balance: 250 }));
      const res = await client.getBalance();
      expect(res.balance).toBe(250);
    });

    it('throws XmlStockError when balance returns ERROR_ code', async () => {
      mock.onGet('/api/').reply(200, 'ERROR_VERIFICATION_KEY');
      await expect(client.getBalance()).rejects.toThrow(XmlStockError);
    });

    it('throws XmlStockError when balance response contains error property', async () => {
      mock.onGet('/api/').reply(200, { error: 'Invalid user id' });
      await expect(client.getBalance()).rejects.toThrow(XmlStockError);
    });
  });

  describe('searchYandex', () => {
    it('sends query with soft_id and returns xml string', async () => {
      const mockXml = '<?xml version="1.0" encoding="utf-8"?><yandexsearch><response date="20261027"><results><grouping></grouping></results></response></yandexsearch>';

      mock.onGet('/yandex/xml/').reply((config) => {
        expect(config.params?.user).toBe('12345');
        expect(config.params?.key).toBe('test_api_key');
        expect(config.params?.query).toBe('test query');
        expect(config.params?.lr).toBe(213);
        expect(config.params?.soft_id).toBe(DEFAULT_SOFT_ID);
        return [200, mockXml];
      });

      const xml = await client.searchYandex('test query', { lr: 213 });
      expect(xml).toBe(mockXml);
    });

    it('throws XmlStockError if search query is empty', async () => {
      await expect(client.searchYandex('')).rejects.toThrow(XmlStockError);
    });

    it('throws XmlStockError when Yandex returns error XML', async () => {
      const errorXml = '<?xml version="1.0" encoding="utf-8"?><yandexsearch><response><error code="15">No results found</error></response></yandexsearch>';
      mock.onGet('/yandex/xml/').reply(200, errorXml);

      await expect(client.searchYandex('nonexistent query')).rejects.toThrow(XmlStockError);
    });
  });

  describe('searchYandexLive', () => {
    it('sends query to yandexlive endpoint with soft_id', async () => {
      const mockXml = '<yandexsearch><response><results/></response></yandexsearch>';
      mock.onGet('/yandexlive/xml/').reply((config) => {
        expect(config.params?.query).toBe('live query');
        expect(config.params?.soft_id).toBe(DEFAULT_SOFT_ID);
        return [200, mockXml];
      });

      const xml = await client.searchYandexLive('live query');
      expect(xml).toBe(mockXml);
    });

    it('throws XmlStockError on HTTP error', async () => {
      mock.onGet('/yandexlive/xml/').reply(500, 'Internal Server Error');
      await expect(client.searchYandexLive('live query')).rejects.toThrow(XmlStockError);
    });
  });

  describe('searchGoogle', () => {
    it('sends query to google endpoint with soft_id', async () => {
      const mockXml = '<googlesearch><response><results/></response></googlesearch>';
      mock.onGet('/google/xml/').reply((config) => {
        expect(config.params?.query).toBe('google query');
        expect(config.params?.domain).toBe('com');
        expect(config.params?.soft_id).toBe(DEFAULT_SOFT_ID);
        return [200, mockXml];
      });

      const xml = await client.searchGoogle('google query', { domain: 'com' });
      expect(xml).toBe(mockXml);
    });

    it('throws XmlStockError when Google returns error XML', async () => {
      const errorXml = '<googlesearch><response><error code="32">Limit exceeded</error></response></googlesearch>';
      mock.onGet('/google/xml/').reply(200, errorXml);

      await expect(client.searchGoogle('google query')).rejects.toThrow(XmlStockError);
    });
  });

  describe('getWordstat', () => {
    it('sends words array with soft_id and returns json', async () => {
      mock.onGet('/wordstat/json/').reply((config) => {
        expect(config.params?.words).toBe('keyword1,keyword2');
        expect(config.params?.pagetype).toBe('words');
        expect(config.params?.soft_id).toBe(DEFAULT_SOFT_ID);
        return [200, { success: true, data: [{ word: 'keyword1', count: 1200 }] }];
      });

      const res = await client.getWordstat(['keyword1', 'keyword2']);
      expect(res.success).toBe(true);
    });

    it('throws XmlStockError when Wordstat API returns error object', async () => {
      mock.onGet('/wordstat/json/').reply(200, {
        error: { code: 100, message: 'Invalid API key' },
      });

      await expect(client.getWordstat('test')).rejects.toThrow(XmlStockError);
    });

    it('throws XmlStockError when Wordstat returns invalid json', async () => {
      mock.onGet('/wordstat/json/').reply(200, 'Not JSON response');
      await expect(client.getWordstat('test')).rejects.toThrow(XmlStockError);
    });
  });
});
