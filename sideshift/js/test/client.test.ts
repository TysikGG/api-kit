import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { SideShift, AFFILIATE_ID, SideShiftError } from '../src/index.js';

describe('SideShift', () => {
  let mock: MockAdapter;
  let client: SideShift;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new SideShift({ secret: 'test_secret' });
  });

  afterEach(() => {
    mock.restore();
  });

  it('includes affiliateId in quote and shift requests', async () => {
    mock.onPost('/quotes').reply((config) => {
      const data = JSON.parse(config.data);
      expect(data.affiliateId).toBe(AFFILIATE_ID);
      expect(data.affiliateId).toBe('TEfvFYrJO');
      return [200, { id: 'quote_123', depositAmount: '1', settleAmount: '0.05' }];
    });

    const quote = await client.requestQuote({
      depositCoin: 'eth',
      depositNetwork: 'ethereum',
      settleCoin: 'btc',
      settleNetwork: 'bitcoin',
      depositAmount: '1',
    });
    expect(quote.id).toBe('quote_123');

    mock.onPost('/shifts/fixed').reply((config) => {
      const data = JSON.parse(config.data);
      expect(data.affiliateId).toBe(AFFILIATE_ID);
      expect(data.quoteId).toBe('quote_123');
      return [200, { id: 'shift_123', depositAddress: '0xabc' }];
    });

    const shift = await client.createFixedShift({
      quoteId: 'quote_123',
      settleAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    });
    expect(shift.id).toBe('shift_123');

    mock.onPost('/shifts/variable').reply((config) => {
      const data = JSON.parse(config.data);
      expect(data.affiliateId).toBe(AFFILIATE_ID);
      return [200, { id: 'var_shift_123', depositAddress: '0xdef' }];
    });

    const varShift = await client.createVariableShift({
      depositCoin: 'eth',
      depositNetwork: 'ethereum',
      settleCoin: 'btc',
      settleNetwork: 'bitcoin',
      settleAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    });
    expect(varShift.id).toBe('var_shift_123');
  });

  describe('getCoins', () => {
    it('returns coins list', async () => {
      mock.onGet('/coins').reply(200, [
        { coin: 'ETH', name: 'Ethereum', networks: ['ethereum'] },
      ]);
      const coins = await client.getCoins();
      expect(coins).toHaveLength(1);
      expect(coins[0].coin).toBe('ETH');
    });

    it('throws SideShiftError on failure', async () => {
      mock.onGet('/coins').reply(500, {
        error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
      });
      await expect(client.getCoins()).rejects.toThrow(SideShiftError);
    });
  });

  describe('getPair & getPairs', () => {
    it('returns single pair rate', async () => {
      mock.onGet('/pair/eth-ethereum/btc-bitcoin').reply((config) => {
        expect(config.params?.affiliateId).toBe(AFFILIATE_ID);
        return [200, { rate: '0.05', min: '0.01', max: '10' }];
      });
      const pair = await client.getPair('eth', 'ethereum', 'btc', 'bitcoin');
      expect(pair.rate).toBe('0.05');
    });

    it('returns bulk pairs', async () => {
      mock.onGet('/pairs').reply(200, [
        { rate: '0.05', min: '0.01', max: '10' },
      ]);
      const pairs = await client.getPairs(['eth-ethereum/btc-bitcoin']);
      expect(pairs).toHaveLength(1);
    });
  });

  describe('shifts', () => {
    it('getShift returns shift details', async () => {
      mock.onGet('/shifts/shift_123').reply(200, {
        id: 'shift_123',
        status: 'waiting',
      });
      const shift = await client.getShift('shift_123');
      expect(shift.id).toBe('shift_123');
    });

    it('getShifts returns bulk shifts', async () => {
      mock.onGet('/shifts').reply(200, [{ id: 's1' }, { id: 's2' }]);
      const shifts = await client.getShifts(['s1', 's2']);
      expect(shifts).toHaveLength(2);
    });

    it('getRecentShifts returns recent shifts', async () => {
      mock.onGet('/recent-shifts').reply(200, [{ id: 'r1' }]);
      const recent = await client.getRecentShifts(5);
      expect(recent).toHaveLength(1);
    });
  });

  describe('metadata & auxiliary methods', () => {
    it('getPermissions returns permissions', async () => {
      mock.onGet('/permissions').reply(200, { createShift: true });
      const perms = await client.getPermissions();
      expect(perms.createShift).toBe(true);
    });

    it('getXaiStats returns XAI stats', async () => {
      mock.onGet('/xai/stats').reply(200, { totalSupply: 210000000 });
      const stats = await client.getXaiStats();
      expect(stats.totalSupply).toBe(210000000);
    });

    it('getAccount returns account details', async () => {
      mock.onGet('/account').reply(200, { id: 'acc_123' });
      const acc = await client.getAccount();
      expect(acc.id).toBe('acc_123');
    });

    it('setRefundAddress calls refund address endpoint', async () => {
      mock.onPost('/shifts/s1/set-refund-address').reply(200, { success: true });
      const res = await client.setRefundAddress('s1', '0xabc');
      expect(res).toEqual({ success: true });
    });

    it('cancelOrder calls cancel endpoint', async () => {
      mock.onPost('/cancel-order').reply(200, { success: true });
      const res = await client.cancelOrder('order_1');
      expect(res).toEqual({ success: true });
    });
  });
});
