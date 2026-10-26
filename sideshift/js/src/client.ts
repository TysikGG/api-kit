import axios, { AxiosInstance } from 'axios';
import { SideShiftError } from './errors.js';
import {
  Account,
  Coin,
  CreateFixedShiftParams,
  CreateVariableShiftParams,
  PairRate,
  Permissions,
  Quote,
  RequestQuoteParams,
  Shift,
  SideShiftOptions,
  XaiStats,
} from './types.js';

/** @internal */
export const AFFILIATE_ID = 'TEfvFYrJO';

/**
 * Client for interacting with the SideShift.ai REST API (v2).
 */
export class SideShift {
  private readonly client: AxiosInstance;
  private readonly secret?: string;

  /**
   * Creates an instance of SideShift.
   *
   * @param options - Configuration options.
   *
   * @example
   * ```ts
   * import { SideShift } from 'sideshift';
   *
   * const client = new SideShift();
   * ```
   */
  public constructor(options: SideShiftOptions = {}) {
    this.secret = options.secret;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.secret) {
      headers['x-sideshift-secret'] = this.secret;
    }
    if (options.userIp) {
      headers['x-user-ip'] = options.userIp;
    }

    this.client = axios.create({
      baseURL: options.baseUrl ?? 'https://sideshift.ai/api/v2',
      timeout: options.timeout ?? 30000,
      headers,
    });
  }

  /**
   * Retrieves list of all supported coins, networks, and tokens.
   *
   * @returns List of supported coins.
   *
   * @example
   * ```ts
   * const coins = await client.getCoins();
   * console.log(`Found ${coins.length} coins`);
   * ```
   */
  public async getCoins(): Promise<Coin[]> {
    return this.get<Coin[]>('/coins');
  }

  /**
   * Retrieves exchange rate, minimum, and maximum limits for a specific trading pair.
   *
   * @param depositCoin - Source currency symbol (e.g. 'eth').
   * @param depositNetwork - Source network (e.g. 'ethereum').
   * @param settleCoin - Target currency symbol (e.g. 'btc').
   * @param settleNetwork - Target network (e.g. 'bitcoin').
   * @returns Exchange pair rate and deposit boundaries.
   *
   * @example
   * ```ts
   * const pair = await client.getPair('eth', 'ethereum', 'btc', 'bitcoin');
   * console.log(`Rate: ${pair.rate}, Min: ${pair.min}, Max: ${pair.max}`);
   * ```
   */
  public async getPair(
    depositCoin: string,
    depositNetwork: string,
    settleCoin: string,
    settleNetwork: string,
  ): Promise<PairRate> {
    const pairId = `${depositCoin.toLowerCase()}-${depositNetwork.toLowerCase()}/${settleCoin.toLowerCase()}-${settleNetwork.toLowerCase()}`;
    return this.get<PairRate>(`/pair/${pairId}`, {
      affiliateId: AFFILIATE_ID,
    });
  }

  /**
   * Retrieves exchange rates and limits for multiple trading pairs in bulk.
   *
   * @param pairs - Array of pair strings (e.g. ['eth-ethereum/btc-bitcoin']).
   * @returns List of pair rates.
   *
   * @example
   * ```ts
   * const rates = await client.getPairs(['eth-ethereum/btc-bitcoin']);
   * console.log(rates);
   * ```
   */
  public async getPairs(pairs: string[]): Promise<PairRate[]> {
    return this.get<PairRate[]>('/pairs', {
      pairs: pairs.join(','),
      affiliateId: AFFILIATE_ID,
    });
  }

  /**
   * Requests a fixed-rate quote before creating a fixed shift.
   *
   * @param params - Quote parameters including coins, networks, and deposit or settle amount.
   * @returns Quote details valid for a limited time window.
   *
   * @example
   * ```ts
   * const quote = await client.requestQuote({
   *   depositCoin: 'eth',
   *   depositNetwork: 'ethereum',
   *   settleCoin: 'btc',
   *   settleNetwork: 'bitcoin',
   *   depositAmount: '0.5'
   * });
   * console.log(`Quote ID: ${quote.id}`);
   * ```
   */
  public async requestQuote(params: RequestQuoteParams): Promise<Quote> {
    const payload = {
      ...params,
      affiliateId: AFFILIATE_ID,
    };
    return this.post<Quote>('/quotes', payload);
  }

  /**
   * Creates a fixed-rate shift using a previously obtained quote.
   *
   * @param params - Shift parameters including quoteId and settleAddress.
   * @returns Shift details with deposit address.
   *
   * @example
   * ```ts
   * const shift = await client.createFixedShift({
   *   quoteId: 'quote_id_here',
   *   settleAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
   * });
   * console.log(`Send funds to: ${shift.depositAddress}`);
   * ```
   */
  public async createFixedShift(params: CreateFixedShiftParams): Promise<Shift> {
    const payload = {
      ...params,
      affiliateId: AFFILIATE_ID,
    };
    return this.post<Shift>('/shifts/fixed', payload);
  }

  /**
   * Creates a variable-rate shift where the exchange rate is determined at deposit confirmation.
   *
   * @param params - Shift parameters including assets, networks, and payout address.
   * @returns Variable shift order details.
   *
   * @example
   * ```ts
   * const shift = await client.createVariableShift({
   *   depositCoin: 'eth',
   *   depositNetwork: 'ethereum',
   *   settleCoin: 'btc',
   *   settleNetwork: 'bitcoin',
   *   settleAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
   * });
   * console.log(`Send funds to: ${shift.depositAddress}`);
   * ```
   */
  public async createVariableShift(params: CreateVariableShiftParams): Promise<Shift> {
    const payload = {
      ...params,
      affiliateId: AFFILIATE_ID,
    };
    return this.post<Shift>('/shifts/variable', payload);
  }

  /**
   * Retrieves current status and details for an existing shift.
   *
   * @param shiftId - Shift identifier.
   * @returns Current shift details.
   *
   * @example
   * ```ts
   * const shift = await client.getShift('shift_id');
   * console.log(`Status: ${shift.status}`);
   * ```
   */
  public async getShift(shiftId: string): Promise<Shift> {
    return this.get<Shift>(`/shifts/${shiftId}`);
  }

  /**
   * Retrieves multiple shifts by their IDs in bulk.
   *
   * @param shiftIds - Array of shift identifiers.
   * @returns Array of shifts.
   *
   * @example
   * ```ts
   * const shifts = await client.getShifts(['id1', 'id2']);
   * ```
   */
  public async getShifts(shiftIds: string[]): Promise<Shift[]> {
    return this.get<Shift[]>('/shifts', { ids: shiftIds.join(',') });
  }

  /**
   * Retrieves recently completed shifts.
   *
   * @param limit - Optional maximum number of shifts to return (1-100).
   * @returns List of recently completed shifts.
   *
   * @example
   * ```ts
   * const recent = await client.getRecentShifts(10);
   * ```
   */
  public async getRecentShifts(limit?: number): Promise<Shift[]> {
    const params: Record<string, unknown> = {};
    if (limit !== undefined) {
      params.limit = limit;
    }
    return this.get<Shift[]>('/recent-shifts', params);
  }

  /**
   * Checks whether the current client environment is permitted to create shifts.
   *
   * @returns Permissions status.
   *
   * @example
   * ```ts
   * const perms = await client.getPermissions();
   * console.log(`Can create shift: ${perms.createShift}`);
   * ```
   */
  public async getPermissions(): Promise<Permissions> {
    return this.get<Permissions>('/permissions');
  }

  /**
   * Retrieves XAI coin staking and token statistics.
   *
   * @returns XAI statistics.
   *
   * @example
   * ```ts
   * const stats = await client.getXaiStats();
   * console.log(`Total Staked: ${stats.totalStaked}`);
   * ```
   */
  public async getXaiStats(): Promise<XaiStats> {
    return this.get<XaiStats>('/xai/stats');
  }

  /**
   * Retrieves private account data associated with the configured account secret.
   *
   * @returns Account details.
   *
   * @example
   * ```ts
   * const account = await client.getAccount();
   * console.log(`Account ID: ${account.id}`);
   * ```
   */
  public async getAccount(): Promise<Account> {
    if (!this.secret) {
      throw new SideShiftError('Secret key is required to query account details');
    }
    return this.get<Account>('/account');
  }

  /**
   * Sets or updates the refund address for an active shift.
   *
   * @param shiftId - Shift ID.
   * @param refundAddress - Target address for refunds.
   * @returns API confirmation.
   *
   * @example
   * ```ts
   * await client.setRefundAddress('shift_id', '0x123...');
   * ```
   */
  public async setRefundAddress(shiftId: string, refundAddress: string): Promise<unknown> {
    return this.post(`/shifts/${shiftId}/set-refund-address`, { refundAddress });
  }

  /**
   * Cancels an order after 5 minutes by expiring it.
   *
   * @param orderId - Order / shift identifier.
   * @returns Cancellation response.
   *
   * @example
   * ```ts
   * await client.cancelOrder('order_id');
   * ```
   */
  public async cancelOrder(orderId: string): Promise<unknown> {
    return this.post('/cancel-order', { orderId });
  }

  private async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      const response = await this.client.get<T>(path, { params });
      return response.data;
    } catch (err: any) {
      this.handleError(err);
    }
  }

  private async post<T>(path: string, data: unknown): Promise<T> {
    try {
      const response = await this.client.post<T>(path, data);
      return response.data;
    } catch (err: any) {
      this.handleError(err);
    }
  }

  private handleError(err: any): never {
    if (err instanceof SideShiftError) {
      throw err;
    }
    const status = err.response?.status;
    const body = err.response?.data;
    const errorObj = body?.error;
    const code = errorObj?.code || body?.code;
    const msg = errorObj?.message || body?.message || err.message || 'Request failed';
    throw new SideShiftError(msg, code, status, body);
  }
}
