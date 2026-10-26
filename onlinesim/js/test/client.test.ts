import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { OnlineSim, DEFAULT_DEV_ID, OnlineSimError } from '../src/index.js';

describe('OnlineSim', () => {
  let mock: MockAdapter;
  let client: OnlineSim;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new OnlineSim({ apiKey: 'test_api_key' });
  });

  afterEach(() => {
    mock.restore();
  });

  it('includes dev_id in getNum and getRentNum requests', async () => {
    mock.onGet('/getNum.php').reply((config) => {
      expect(config.params?.dev_id).toBe(DEFAULT_DEV_ID);
      expect(config.params?.dev_id).toBe(9656076);
      expect(config.params?.apikey).toBe('test_api_key');
      expect(config.params?.service).toBe('telegram');
      return [200, { response: '1', tzid: 998877 }];
    });

    const res = await client.getNum({ service: 'telegram', country: 7 });
    expect(res.tzid).toBe(998877);

    mock.onGet('/getRentNum.php').reply((config) => {
      expect(config.params?.dev_id).toBe(DEFAULT_DEV_ID);
      expect(config.params?.dev_id).toBe(9656076);
      return [200, { response: '1', tzid: 554433 }];
    });

    const rent = await client.getRentNum({ country: 7, days: 1 });
    expect((rent as any).tzid).toBe(554433);
  });

  describe('getBalance', () => {
    it('returns parsed balance', async () => {
      mock.onGet('/getBalance.php').reply(200, { response: '1', balance: '150.25' });
      const bal = await client.getBalance();
      expect(bal).toBe(150.25);
    });

    it('throws OnlineSimError on API error code', async () => {
      mock.onGet('/getBalance.php').reply(200, { response: 'ERROR_WRONG_KEY' });
      await expect(client.getBalance()).rejects.toThrow(OnlineSimError);
    });
  });

  describe('tariffs & directory methods', () => {
    it('getTariffs succeeds', async () => {
      mock.onGet('/getTariffs.php').reply(200, { response: '1', countries: {} });
      const tariffs = await client.getTariffs();
      expect(tariffs).toEqual({ response: '1', countries: {} });
    });

    it('getServiceList succeeds', async () => {
      mock.onGet('/getServiceList.php').reply(200, { response: '1', services: {} });
      const services = await client.getServiceList(7);
      expect(services).toEqual({ response: '1', services: {} });
    });

    it('getCountries succeeds', async () => {
      mock.onGet('/getCountries.php').reply(200, { response: '1', countries: [] });
      const countries = await client.getCountries();
      expect(countries).toEqual({ response: '1', countries: [] });
    });
  });

  describe('activation lifecycle', () => {
    it('getState returns array of states', async () => {
      mock.onGet('/getState.php').reply(200, [
        { tzid: 123, response: 'TZ_NUM_ANSWER', number: '+79001234567', msg: '9988' },
      ]);
      const state = await client.getState(123);
      expect(state).toHaveLength(1);
      expect(state[0].number).toBe('+79001234567');
      expect(state[0].msg).toBe('9988');
    });

    it('setOperationOk succeeds', async () => {
      mock.onGet('/setOperationOk.php').reply(200, { response: '1' });
      const ok = await client.setOperationOk(123);
      expect(ok).toBe(true);
    });

    it('setOperationRevise succeeds', async () => {
      mock.onGet('/setOperationRevise.php').reply(200, { response: '1' });
      const ok = await client.setOperationRevise(123);
      expect(ok).toBe(true);
    });

    it('closeRentNum succeeds', async () => {
      mock.onGet('/closeRentNum.php').reply(200, { response: '1' });
      const ok = await client.closeRentNum(123);
      expect(ok).toBe(true);
    });

    it('getRentTariffs & getRentState succeed', async () => {
      mock.onGet('/getRentTariffs.php').reply(200, { response: '1' });
      mock.onGet('/getRentState.php').reply(200, { response: '1' });

      const rt = await client.getRentTariffs();
      expect(rt).toEqual({ response: '1' });

      const rs = await client.getRentState(123);
      expect(rs).toEqual({ response: '1' });
    });
  });
});
