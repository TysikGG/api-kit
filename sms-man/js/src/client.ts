import axios, { AxiosInstance } from 'axios';
import { SmsManError } from './errors.js';
import { HandlerStatusResult, PhoneNumberOrder, SmsCodeResult, SmsManOptions } from './types.js';

/** @internal */
export const DEFAULT_REF = 's_iNhkmN48Jf';

/**
 * Client for the SMS-MAN virtual number and SMS activation API.
 */
export class SmsMan {
  private readonly client: AxiosInstance;
  private readonly token: string;

  /**
   * Creates an instance of SmsMan.
   *
   * @param options - Configuration options or token string.
   *
   * @example
   * ```ts
   * import { SmsMan } from 'sms-man';
   *
   * const client = new SmsMan({ token: 'YOUR_API_TOKEN' });
   * ```
   */
  public constructor(options: string | SmsManOptions) {
    const config = typeof options === 'string' ? { token: options } : options;
    if (!config.token) {
      throw new SmsManError('API token is required');
    }
    this.token = config.token;
    this.client = axios.create({
      baseURL: config.baseUrl ?? 'https://api.sms-man.com',
      timeout: config.timeout ?? 30000,
    });
  }

  /**
   * Retrieves the current user account balance.
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
    const data = await this.callControl<any>('get-balance');
    const bal = data.balance;
    if (bal === undefined) {
      throw new SmsManError('Missing balance in API response', undefined, data);
    }
    const num = typeof bal === 'number' ? bal : parseFloat(String(bal));
    if (isNaN(num)) {
      throw new SmsManError(`Failed to parse balance: ${bal}`, undefined, data);
    }
    return num;
  }

  /**
   * Retrieves the number of available phone numbers for a country and application.
   *
   * @param countryId - Country identifier (e.g. 1 for Russia, 2 for Kazakhstan).
   * @param applicationId - Application/service identifier (e.g. 1 for Telegram).
   * @returns Availability count or limits details.
   *
   * @example
   * ```ts
   * const limits = await client.getLimits(1, 1);
   * console.log(limits);
   * ```
   */
  public async getLimits(countryId?: number, applicationId?: number): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (countryId !== undefined) params.country_id = countryId;
    if (applicationId !== undefined) params.application_id = applicationId;
    return this.callControl('limits', params);
  }

  /**
   * Retrieves prices for all services in a country.
   *
   * @param countryId - Optional country identifier.
   * @returns Map of service pricing.
   *
   * @example
   * ```ts
   * const prices = await client.getPrices(1);
   * console.log(prices);
   * ```
   */
  public async getPrices(countryId?: number): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (countryId !== undefined) params.country_id = countryId;
    return this.callControl('get-prices', params);
  }

  /**
   * Retrieves list of all supported countries.
   *
   * @returns Map of supported countries.
   *
   * @example
   * ```ts
   * const countries = await client.getCountries();
   * console.log(countries);
   * ```
   */
  public async getCountries(): Promise<unknown> {
    return this.callControl('countries');
  }

  /**
   * Retrieves list of all supported applications/services.
   *
   * @returns Map of supported applications.
   *
   * @example
   * ```ts
   * const apps = await client.getApplications();
   * console.log(apps);
   * ```
   */
  public async getApplications(): Promise<unknown> {
    return this.callControl('applications');
  }

  /**
   * Orders a disposable virtual phone number.
   *
   * @param countryId - Country identifier (use 0 for random).
   * @param applicationId - Service identifier.
   * @returns Order details with requestId and phone number.
   *
   * @example
   * ```ts
   * const order = await client.getNumber(1, 1);
   * console.log(`Allocated number: ${order.number} (Request ID: ${order.requestId})`);
   * ```
   */
  public async getNumber(countryId: number, applicationId: number): Promise<PhoneNumberOrder> {
    const data = await this.callControl<any>('get-number', {
      country_id: countryId,
      application_id: applicationId,
      ref: DEFAULT_REF,
    });
    const requestId = data.request_id;
    const number = data.number_p || data.number;
    if (!requestId || !number) {
      throw new SmsManError('Incomplete number data returned by API', undefined, data);
    }
    return {
      requestId: Number(requestId),
      number: String(number),
    };
  }

  /**
   * Retrieves the received SMS code for an active order.
   *
   * @param requestId - Order request ID.
   * @returns Received SMS code.
   *
   * @example
   * ```ts
   * const res = await client.getSms(12345);
   * if (res.smsCode) {
   *   console.log(`Received code: ${res.smsCode}`);
   * }
   * ```
   */
  public async getSms(requestId: number): Promise<SmsCodeResult> {
    const data = await this.callControl<any>('get-sms', {
      request_id: requestId,
    });
    return {
      smsCode: data.sms_code,
      error: data.error_msg,
    };
  }

  /**
   * Updates status of an order (e.g. 'ready', 'reject').
   *
   * @param requestId - Order request ID.
   * @param status - Target status string.
   * @returns True if successfully updated.
   *
   * @example
   * ```ts
   * await client.setStatus(12345, 'reject');
   * ```
   */
  public async setStatus(requestId: number, status: 'ready' | 'reject' | string): Promise<boolean> {
    await this.callControl('set-status', {
      request_id: requestId,
      status,
    });
    return true;
  }

  /**
   * Retrieves account balance using SMS-Activate compatible handler endpoint.
   *
   * @returns Current account balance.
   *
   * @example
   * ```ts
   * const balance = await client.handlerGetBalance();
   * ```
   */
  public async handlerGetBalance(): Promise<number> {
    const text = await this.callHandler('getBalance');
    if (!text.startsWith('ACCESS_BALANCE:')) {
      throw new SmsManError(`Unexpected balance response: ${text}`, text);
    }
    const val = parseFloat(text.substring('ACCESS_BALANCE:'.length));
    if (isNaN(val)) {
      throw new SmsManError(`Failed to parse balance: ${text}`, text);
    }
    return val;
  }

  /**
   * Orders a number using SMS-Activate compatible handler endpoint.
   *
   * @param country - Country ID.
   * @param service - Service code.
   * @returns Activation ID and number.
   *
   * @example
   * ```ts
   * const num = await client.handlerGetNumber(1, 'tg');
   * ```
   */
  public async handlerGetNumber(
    country: number | string,
    service: string,
  ): Promise<{ id: string; number: string }> {
    const text = await this.callHandler('getNumber', {
      country,
      service,
      ref: DEFAULT_REF,
    });
    if (!text.startsWith('ACCESS_NUMBER:')) {
      throw new SmsManError(`Failed to order number: ${text}`, text);
    }
    const parts = text.split(':');
    if (parts.length < 3) {
      throw new SmsManError(`Malformed ACCESS_NUMBER response: ${text}`, text);
    }
    return {
      id: parts[1],
      number: parts[2],
    };
  }

  /**
   * Retrieves status and code via handler endpoint.
   *
   * @param id - Activation ID.
   * @returns Status and code.
   *
   * @example
   * ```ts
   * const status = await client.handlerGetStatus('12345');
   * ```
   */
  public async handlerGetStatus(id: string | number): Promise<HandlerStatusResult> {
    const text = await this.callHandler('getStatus', { id });
    if (text.startsWith('STATUS_OK:')) {
      return { status: 'STATUS_OK', code: text.substring('STATUS_OK:'.length) };
    }
    return { status: text };
  }

  /**
   * Sets status via handler endpoint.
   *
   * @param id - Activation ID.
   * @param status - Status code.
   * @returns Response text.
   *
   * @example
   * ```ts
   * await client.handlerSetStatus('12345', 1);
   * ```
   */
  public async handlerSetStatus(id: string | number, status: number): Promise<string> {
    return this.callHandler('setStatus', { id, status });
  }

  /**
   * Retrieves prices via handler endpoint.
   *
   * @param country - Optional country code.
   * @returns Prices response.
   *
   * @example
   * ```ts
   * const prices = await client.handlerGetPrices(1);
   * ```
   */
  public async handlerGetPrices(country?: number | string): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (country !== undefined) params.country = country;
    const text = await this.callHandler('getPrices', params);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async callControl<T = unknown>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      const response = await this.client.get<T>(`/control/${endpoint}`, {
        params: {
          token: this.token,
          ...params,
        },
      });

      const data = response.data as any;
      if (data && typeof data === 'object') {
        if (data.success === false) {
          const code = data.error_code;
          const msg = data.error_msg || `SMS-MAN error: ${code}`;
          throw new SmsManError(msg, code, data);
        }
      }
      return data;
    } catch (err: any) {
      if (err instanceof SmsManError) {
        throw err;
      }
      const data = err.response?.data;
      const msg = data?.error_msg || err.message || 'Request failed';
      throw new SmsManError(msg, data?.error_code, data);
    }
  }

  private async callHandler(action: string, params: Record<string, unknown> = {}): Promise<string> {
    try {
      const response = await this.client.get<string>('/stubs/handler_api.php', {
        params: {
          action,
          api_key: this.token,
          ...params,
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
      ];
      for (const errCode of errorCodes) {
        if (text === errCode || text.startsWith(`${errCode}:`)) {
          throw new SmsManError(`API error: ${text}`, text);
        }
      }
      return text;
    } catch (err: any) {
      if (err instanceof SmsManError) {
        throw err;
      }
      throw new SmsManError(err.message || 'Handler request failed', err.response?.status, err.response?.data);
    }
  }
}
