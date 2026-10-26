import axios, { AxiosInstance } from 'axios';
import { GiveSmsError } from './errors.js';
import {
  ActivationNumber,
  ApiResponse,
  CodeResult,
  GetCountOptions,
  GetNumberOptions,
  GiveSmsOptions,
  HandlerStatusResult,
} from './types.js';

/** @internal */
export const PARTNER_KEY = 'pk_39579ba6dfd61e59';

/**
 * Client for interacting with the Give-SMS API.
 */
export class GiveSms {
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  /**
   * Creates an instance of GiveSms.
   *
   * @param options - Configuration options or API key string.
   *
   * @example
   * ```ts
   * import { GiveSms } from 'give-sms';
   *
   * const client = new GiveSms({ apiKey: 'YOUR_API_KEY' });
   * ```
   */
  public constructor(options: string | GiveSmsOptions) {
    const config = typeof options === 'string' ? { apiKey: options } : options;
    if (!config.apiKey) {
      throw new GiveSmsError('API key is required');
    }
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.baseUrl ?? 'https://give-sms.com',
      timeout: config.timeout ?? 30000,
    });
  }

  /**
   * Retrieves the current account balance via the native JSON API (/api/v1/).
   *
   * @returns Current account balance.
   *
   * @example
   * ```ts
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance}`);
   * ```
   */
  public async getBalance(): Promise<number> {
    const res = await this.callApi<Record<string, unknown>>('getbalance');
    const balanceVal = (res.data as any)?.balance ?? (res.data as any)?.user_balance ?? res.data;
    const balanceNum = typeof balanceVal === 'number' ? balanceVal : parseFloat(String(balanceVal));
    if (isNaN(balanceNum)) {
      throw new GiveSmsError('Invalid balance received from API', undefined, res);
    }
    return balanceNum;
  }

  /**
   * Retrieves the count of available numbers for services via /api/v1/.
   *
   * @param options - Optional filters by country and operator.
   * @returns Map of service codes to availability info or counts.
   *
   * @example
   * ```ts
   * const counts = await client.getCount({ country: 'kazakhstan' });
   * console.log(counts);
   * ```
   */
  public async getCount(options?: GetCountOptions): Promise<Record<string, unknown>> {
    const params: Record<string, unknown> = {};
    if (options?.country) {
      params.country = options.country;
    }
    if (options?.operator) {
      params.operator = options.operator;
    }
    const res = await this.callApi<Record<string, unknown>>('getcount', params);
    return res.data;
  }

  /**
   * Orders a phone number for the specified service via /api/v1/.
   *
   * @param options - Order parameters including service and optional country.
   * @returns Order details with ID and allocated phone number.
   *
   * @example
   * ```ts
   * const order = await client.getNumber({ service: 'vk', country: 'kazakhstan' });
   * console.log(`Ordered ${order.number} with ID ${order.id}`);
   * ```
   */
  public async getNumber(options: GetNumberOptions): Promise<ActivationNumber> {
    const params: Record<string, unknown> = {
      service: options.service,
    };
    if (options.country !== undefined) {
      params.country = options.country;
    }
    if (options.operator !== undefined) {
      params.operator = options.operator;
    }
    if (options.maxPrice !== undefined) {
      params.maxPrice = options.maxPrice;
    }

    const res = await this.callApi<{ id?: string | number; number?: string; phone?: string }>('getnumber', params);
    const id = res.data?.id;
    const number = res.data?.number ?? res.data?.phone;
    if (!id || !number) {
      throw new GiveSmsError('Incomplete number data returned by API', undefined, res);
    }
    return { id, number };
  }

  /**
   * Gets the SMS code or status for an ordered number via /api/v1/.
   *
   * @param id - Activation ID.
   * @returns Verification code and status.
   *
   * @example
   * ```ts
   * const res = await client.getCode('123456');
   * if (res.code) {
   *   console.log(`Received code: ${res.code}`);
   * }
   * ```
   */
  public async getCode(id: string | number): Promise<CodeResult> {
    const res = await this.callApi<Record<string, unknown>>('getcode', { id });
    const data = res.data as any;
    return {
      code: data?.code,
      status: String(data?.status ?? 'WAIT'),
      extra: data,
    };
  }

  /**
   * Requests a repeat SMS code for an activation via /api/v1/.
   *
   * @param id - Activation ID.
   * @returns True if successful.
   *
   * @example
   * ```ts
   * await client.repeatCode('123456');
   * ```
   */
  public async repeatCode(id: string | number): Promise<boolean> {
    await this.callApi('repeatcode', { id });
    return true;
  }

  /**
   * Cancels an active number order via /api/v1/.
   *
   * @param id - Activation ID.
   * @returns True if cancellation succeeded.
   *
   * @example
   * ```ts
   * await client.cancelNumber('123456');
   * ```
   */
  public async cancelNumber(id: string | number): Promise<boolean> {
    await this.callApi('cancelnumber', { id });
    return true;
  }

  /**
   * Marks a number as banned / blacklisted via /api/v1/.
   *
   * @param id - Activation ID.
   * @returns True if successfully marked.
   *
   * @example
   * ```ts
   * await client.banNumber('123456');
   * ```
   */
  public async banNumber(id: string | number): Promise<boolean> {
    await this.callApi('bannumber', { id });
    return true;
  }

  /**
   * Retrieves reactivation options for a previously used number via /api/v1/.
   *
   * @param id - Activation ID.
   * @returns Reactivation options details.
   *
   * @example
   * ```ts
   * const options = await client.getReactivationOptions('123456');
   * console.log(options);
   * ```
   */
  public async getReactivationOptions(id: string | number): Promise<unknown> {
    const res = await this.callApi('getreactivationoptions', { id });
    return res.data;
  }

  /**
   * Re-activates a previously ordered number via /api/v1/.
   *
   * @param id - Activation ID.
   * @returns Re-activation details.
   *
   * @example
   * ```ts
   * const res = await client.reactivate('123456');
   * console.log(res);
   * ```
   */
  public async reactivate(id: string | number): Promise<unknown> {
    const res = await this.callApi('reactivation', { id });
    return res.data;
  }

  /**
   * Retrieves all active orders for the user account via /api/v1/.
   *
   * @returns Active orders list.
   *
   * @example
   * ```ts
   * const orders = await client.getAll();
   * console.log(orders);
   * ```
   */
  public async getAll(): Promise<unknown> {
    const res = await this.callApi('getall');
    return res.data;
  }

  /**
   * Retrieves account balance using the SMS-Activate compatible handler endpoint.
   *
   * @returns Current account balance.
   *
   * @example
   * ```ts
   * const balance = await client.handlerGetBalance();
   * console.log(`Balance: ${balance}`);
   * ```
   */
  public async handlerGetBalance(): Promise<number> {
    const text = await this.callHandler('getBalance');
    if (!text.startsWith('ACCESS_BALANCE:')) {
      throw new GiveSmsError(`Unexpected balance response: ${text}`, text);
    }
    const val = parseFloat(text.substring('ACCESS_BALANCE:'.length));
    if (isNaN(val)) {
      throw new GiveSmsError(`Invalid balance format: ${text}`, text);
    }
    return val;
  }

  /**
   * Retrieves service availability counts via handler endpoint.
   *
   * @param options - Optional country and operator filters.
   * @returns Record of service codes to available quantity.
   *
   * @example
   * ```ts
   * const status = await client.handlerGetNumbersStatus();
   * console.log(status);
   * ```
   */
  public async handlerGetNumbersStatus(options?: {
    country?: string | number;
    operator?: string;
  }): Promise<Record<string, number>> {
    const params: Record<string, unknown> = {};
    if (options?.country !== undefined) {
      params.country = options.country;
    }
    if (options?.operator !== undefined) {
      params.operator = options.operator;
    }
    const text = await this.callHandler('getNumbersStatus', params);
    try {
      return JSON.parse(text);
    } catch {
      throw new GiveSmsError(`Invalid JSON from handler getNumbersStatus: ${text}`, text);
    }
  }

  /**
   * Orders a phone number using the handler endpoint.
   *
   * @param options - Service, country, operator and price parameters.
   * @returns Activation ID and allocated phone number.
   *
   * @example
   * ```ts
   * const num = await client.handlerGetNumber({ service: 'vk', country: 2 });
   * console.log(`Ordered ${num.number} (ID: ${num.id})`);
   * ```
   */
  public async handlerGetNumber(options: {
    service: string;
    country?: string | number;
    operator?: string;
    maxPrice?: number;
  }): Promise<ActivationNumber> {
    const params: Record<string, unknown> = {
      service: options.service,
    };
    if (options.country !== undefined) {
      params.country = options.country;
    }
    if (options.operator !== undefined) {
      params.operator = options.operator;
    }
    if (options.maxPrice !== undefined) {
      params.maxPrice = options.maxPrice;
    }

    const text = await this.callHandler('getNumber', params);
    if (!text.startsWith('ACCESS_NUMBER:')) {
      throw new GiveSmsError(`Failed to order number: ${text}`, text);
    }
    const parts = text.split(':');
    if (parts.length < 3) {
      throw new GiveSmsError(`Malformed ACCESS_NUMBER response: ${text}`, text);
    }
    return {
      id: parts[1],
      number: parts[2],
    };
  }

  /**
   * Sets the status of an activation via the handler endpoint.
   *
   * @param id - Activation ID.
   * @param status - Target status code (e.g., 1 = ready, 3 = request retry, 6 = finish, 8 = cancel).
   * @returns API status message.
   *
   * @example
   * ```ts
   * const res = await client.handlerSetStatus('12345', 1);
   * console.log(res);
   * ```
   */
  public async handlerSetStatus(id: string | number, status: number): Promise<string> {
    return this.callHandler('setStatus', { id, status });
  }

  /**
   * Checks the status and SMS code of an activation via the handler endpoint.
   *
   * @param id - Activation ID.
   * @returns Status code and received code if available.
   *
   * @example
   * ```ts
   * const status = await client.handlerGetStatus('12345');
   * if (status.code) {
   *   console.log(`Code: ${status.code}`);
   * }
   * ```
   */
  public async handlerGetStatus(id: string | number): Promise<HandlerStatusResult> {
    const text = await this.callHandler('getStatus', { id });
    if (text.startsWith('STATUS_OK:')) {
      return { status: 'STATUS_OK', code: text.substring('STATUS_OK:'.length) };
    }
    if (text.startsWith('STATUS_WAIT_RETRY:')) {
      return { status: 'STATUS_WAIT_RETRY', code: text.substring('STATUS_WAIT_RETRY:'.length) };
    }
    return { status: text };
  }

  /**
   * Retrieves price catalog via handler endpoint.
   *
   * @param options - Optional filters.
   * @returns Price directory.
   *
   * @example
   * ```ts
   * const prices = await client.handlerGetPrices({ country: 2 });
   * console.log(prices);
   * ```
   */
  public async handlerGetPrices(options?: {
    country?: string | number;
    service?: string;
    tiers?: number;
  }): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (options?.country !== undefined) {
      params.country = options.country;
    }
    if (options?.service !== undefined) {
      params.service = options.service;
    }
    if (options?.tiers !== undefined) {
      params.tiers = options.tiers;
    }
    const text = await this.callHandler('getPrices', params);
    try {
      return JSON.parse(text);
    } catch {
      throw new GiveSmsError(`Invalid JSON from handler getPrices: ${text}`, text);
    }
  }

  private async callApi<T = unknown>(method: string, extraParams: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>('/api/v1/', {
        params: {
          method,
          userkey: this.apiKey,
          partner_key: PARTNER_KEY,
          ...extraParams,
        },
      });

      const body = response.data;
      if (typeof body === 'object' && body !== null && 'status' in body) {
        if (body.status !== 200 && (body.status as unknown as number) !== 1) {
          const errMsg = (body.data as any)?.msg || (body.data as any)?.error || `API returned status ${body.status}`;
          throw new GiveSmsError(errMsg, body.status, body);
        }
      }
      return body;
    } catch (err: any) {
      if (err instanceof GiveSmsError) {
        throw err;
      }
      const status = err.response?.status;
      const data = err.response?.data;
      const msg = data?.data?.msg || data?.msg || err.message || 'Request failed';
      throw new GiveSmsError(msg, status, data);
    }
  }

  private async callHandler(action: string, extraParams: Record<string, unknown> = {}): Promise<string> {
    try {
      const response = await this.client.get<string>('/stubs/handler_api.php', {
        params: {
          action,
          api_key: this.apiKey,
          partner_key: PARTNER_KEY,
          ...extraParams,
        },
        responseType: 'text',
      });

      const text = String(response.data).trim();
      const errorCodes = [
        'BAD_KEY',
        'NO_KEY',
        'ERROR_SQL',
        'BAD_ACTION',
        'BAD_SERVICE',
        'NO_ACTIVATION',
        'BAD_STATUS',
        'NO_BALANCE',
        'NO_NUMBERS',
        'WRONG_SERVICE',
        'BAD_COUNTRY',
        'YOU_TEMPORARY_BANNED',
      ];

      for (const errCode of errorCodes) {
        if (text === errCode || text.startsWith(`${errCode}:`)) {
          throw new GiveSmsError(`API error: ${text}`, text);
        }
      }

      return text;
    } catch (err: any) {
      if (err instanceof GiveSmsError) {
        throw err;
      }
      const status = err.response?.status;
      const data = err.response?.data;
      throw new GiveSmsError(err.message || 'Handler request failed', status, data);
    }
  }
}
