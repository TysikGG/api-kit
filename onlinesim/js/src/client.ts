import axios, { AxiosInstance } from 'axios';
import { OnlineSimError } from './errors.js';
import {
  ActivationState,
  GetNumOptions,
  GetRentNumOptions,
  OnlineSimOptions,
  OrderResult,
} from './types.js';

/** @internal */
export const DEFAULT_DEV_ID = 9656076;

/**
 * Client for interacting with the OnlineSIM virtual number and SMS activation API.
 */
export class OnlineSim {
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  /**
   * Creates an instance of OnlineSim.
   *
   * @param options - Configuration options or API key string.
   *
   * @example
   * ```ts
   * import { OnlineSim } from 'onlinesim-client';
   *
   * const client = new OnlineSim({ apiKey: 'YOUR_API_KEY' });
   * ```
   */
  public constructor(options: string | OnlineSimOptions) {
    const config = typeof options === 'string' ? { apiKey: options } : options;
    if (!config.apiKey) {
      throw new OnlineSimError('API key is required');
    }
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.baseUrl ?? 'https://onlinesim.io/api',
      timeout: config.timeout ?? 30000,
    });
  }

  /**
   * Retrieves current user account balance in RUB / user currency.
   *
   * @returns Current balance.
   *
   * @example
   * ```ts
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance}`);
   * ```
   */
  public async getBalance(): Promise<number> {
    const data = await this.request<{ response: string; balance?: string | number }>('/getBalance.php');
    const bal = data.balance;
    if (bal === undefined) {
      throw new OnlineSimError('Missing balance field in response', undefined, data);
    }
    const num = typeof bal === 'number' ? bal : parseFloat(String(bal));
    if (isNaN(num)) {
      throw new OnlineSimError(`Failed to parse balance: ${bal}`, undefined, data);
    }
    return num;
  }

  /**
   * Retrieves current prices and tariffs for disposable activation numbers.
   *
   * @param country - Optional country code filter.
   * @returns Tariffs response.
   *
   * @example
   * ```ts
   * const tariffs = await client.getTariffs(7);
   * console.log(tariffs);
   * ```
   */
  public async getTariffs(country?: number | string): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (country !== undefined) {
      params.country = country;
    }
    return this.request('/getTariffs.php', params);
  }

  /**
   * Retrieves the list of available services and stock counts.
   *
   * @param country - Optional country code filter.
   * @returns Service list.
   *
   * @example
   * ```ts
   * const services = await client.getServiceList(7);
   * console.log(services);
   * ```
   */
  public async getServiceList(country?: number | string): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (country !== undefined) {
      params.country = country;
    }
    return this.request('/getServiceList.php', params);
  }

  /**
   * Retrieves all supported countries.
   *
   * @returns List of supported countries and metadata.
   *
   * @example
   * ```ts
   * const countries = await client.getCountries();
   * console.log(countries);
   * ```
   */
  public async getCountries(): Promise<unknown> {
    return this.request('/getCountries.php');
  }

  /**
   * Orders a disposable virtual phone number for SMS activation.
   *
   * @param options - Order parameters including service and optional country.
   * @returns Order result with assigned tzid.
   *
   * @example
   * ```ts
   * const order = await client.getNum({ service: 'telegram', country: 7 });
   * console.log(`Order ID (tzid): ${order.tzid}`);
   * ```
   */
  public async getNum(options: GetNumOptions): Promise<OrderResult> {
    const params: Record<string, unknown> = {
      service: options.service,
      dev_id: DEFAULT_DEV_ID,
    };
    if (options.country !== undefined) {
      params.country = options.country;
    }
    if (options.reject !== undefined) {
      params.reject = options.reject;
    }
    if (options.number !== undefined) {
      params.number = options.number;
    }
    if (options.clean !== undefined) {
      params.clean = options.clean ? 1 : 0;
    }

    const data = await this.request<OrderResult>('/getNum.php', params);
    if (!data.tzid) {
      throw new OnlineSimError('No tzid returned by getNum', undefined, data);
    }
    return data;
  }

  /**
   * Retrieves the state, phone number, and received SMS message for an order.
   *
   * @param tzid - Activation order ID.
   * @param options - Optional query parameters.
   * @returns Array or object representing activation states.
   *
   * @example
   * ```ts
   * const state = await client.getState(12345);
   * console.log(state);
   * ```
   */
  public async getState(
    tzid?: number | string,
    options?: { messageToCode?: number; msgList?: number },
  ): Promise<ActivationState[]> {
    const params: Record<string, unknown> = {};
    if (tzid !== undefined) {
      params.tzid = tzid;
    }
    if (options?.messageToCode !== undefined) {
      params.message_to_code = options.messageToCode;
    }
    if (options?.msgList !== undefined) {
      params.msg_list = options.msgList;
    }

    const data = await this.request<unknown>('/getState.php', params);
    if (Array.isArray(data)) {
      return data as ActivationState[];
    }
    if (data && typeof data === 'object') {
      return [data as ActivationState];
    }
    throw new OnlineSimError(`Unexpected getState response format: ${JSON.stringify(data)}`, undefined, data);
  }

  /**
   * Confirms successful activation and closes the order.
   *
   * @param tzid - Activation order ID.
   * @returns True if confirmation was recorded.
   *
   * @example
   * ```ts
   * await client.setOperationOk(12345);
   * ```
   */
  public async setOperationOk(tzid: number | string): Promise<boolean> {
    await this.request('/setOperationOk.php', { tzid });
    return true;
  }

  /**
   * Requests a repeat SMS code or marks the operation for revision.
   *
   * @param tzid - Activation order ID.
   * @returns True if revision was requested.
   *
   * @example
   * ```ts
   * await client.setOperationRevise(12345);
   * ```
   */
  public async setOperationRevise(tzid: number | string): Promise<boolean> {
    await this.request('/setOperationRevise.php', { tzid });
    return true;
  }

  /**
   * Retrieves long-term rental tariffs.
   *
   * @returns Rental tariffs catalog.
   *
   * @example
   * ```ts
   * const rentTariffs = await client.getRentTariffs();
   * console.log(rentTariffs);
   * ```
   */
  public async getRentTariffs(): Promise<unknown> {
    return this.request('/getRentTariffs.php');
  }

  /**
   * Orders a long-term rental phone number.
   *
   * @param options - Rental options.
   * @returns Rental order result.
   *
   * @example
   * ```ts
   * const rent = await client.getRentNum({ country: 7, days: 1 });
   * console.log(rent);
   * ```
   */
  public async getRentNum(options: GetRentNumOptions): Promise<unknown> {
    const params: Record<string, unknown> = {
      country: options.country,
      days: options.days,
      dev_id: DEFAULT_DEV_ID,
    };
    if (options.extension) {
      params.extension = 1;
    }
    return this.request('/getRentNum.php', params);
  }

  /**
   * Retrieves status for rented numbers.
   *
   * @param tzid - Optional rent order ID.
   * @returns Rent state details.
   *
   * @example
   * ```ts
   * const rentState = await client.getRentState(12345);
   * console.log(rentState);
   * ```
   */
  public async getRentState(tzid?: number | string): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (tzid !== undefined) {
      params.tzid = tzid;
    }
    return this.request('/getRentState.php', params);
  }

  /**
   * Closes an active rental number.
   *
   * @param tzid - Rent order ID.
   * @returns True if successfully closed.
   *
   * @example
   * ```ts
   * await client.closeRentNum(12345);
   * ```
   */
  public async closeRentNum(tzid: number | string): Promise<boolean> {
    await this.request('/closeRentNum.php', { tzid });
    return true;
  }

  private async request<T = unknown>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      const response = await this.client.get<T>(endpoint, {
        params: {
          apikey: this.apiKey,
          ...params,
        },
      });

      const data = response.data as any;
      if (data && typeof data === 'object') {
        const respCode = data.response;
        if (respCode !== undefined && respCode !== 1 && respCode !== '1' && typeof respCode === 'string') {
          if (respCode.startsWith('ERROR_') || respCode.startsWith('WARNING_') || respCode === 'NO_NUMBER') {
            throw new OnlineSimError(`OnlineSIM error: ${respCode}`, respCode, data);
          }
        }
      }
      return data;
    } catch (err: any) {
      if (err instanceof OnlineSimError) {
        throw err;
      }
      const data = err.response?.data;
      const respCode = data?.response || err.message;
      throw new OnlineSimError(
        `OnlineSIM request failed: ${respCode}`,
        typeof respCode === 'string' ? respCode : undefined,
        data,
      );
    }
  }
}
