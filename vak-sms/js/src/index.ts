import axios, { AxiosInstance } from 'axios';

/**
 * Default software/affiliate identifier (empty if none assigned).
 */
export const DEFAULT_SOFT_ID = '';

/**
 * Configuration options for the VakSmsClient.
 */
export interface VakSmsClientOptions {
  /**
   * API key obtained from VAK-SMS dashboard.
   */
  apiKey: string;
  /**
   * Base URL for the VAK-SMS API. Defaults to https://vak-sms.com.
   */
  baseURL?: string;
  /**
   * Request timeout in milliseconds. Defaults to 30000 ms.
   */
  timeout?: number;
  /**
   * Optional partner/software identifier.
   */
  softId?: string;
}

/**
 * Options for requesting a virtual phone number.
 */
export interface GetNumberOptions {
  /**
   * Service code (e.g. 'tg' for Telegram, 'wa' for WhatsApp) or an array of two codes.
   */
  service: string | string[];
  /**
   * Country code (e.g. 'ru', 'kz', 'ua').
   */
  country?: string;
  /**
   * Mobile operator name (e.g. 'megafon', 'beeline', 'tele2').
   */
  operator?: string;
  /**
   * Whether to order a prolonged rental number (e.g. 4 hours).
   */
  rent?: boolean;
  /**
   * Optional partner/software ID override.
   */
  softId?: string;
}

/**
 * Acquired virtual phone number details.
 */
export interface VakNumber {
  /**
   * Full phone number with country dial code.
   */
  tel: string | number;
  /**
   * Unique operation/order identifier.
   */
  idNum: string;
  /**
   * Service code requested.
   */
  service?: string;
  /**
   * Whether the number was leased under a prolonged rental.
   */
  rent?: boolean;
}

/**
 * Available number count and unit price for a service.
 */
export interface CountNumber {
  /**
   * Service short code.
   */
  service: string;
  /**
   * Number of available phone numbers currently in stock.
   */
  count: number;
  /**
   * Unit cost per activation.
   */
  price?: number;
}

/**
 * Supported country metadata and available operators.
 */
export interface CountryOperator {
  /**
   * Human-readable country name.
   */
  countryName: string;
  /**
   * Country 2-letter ISO code.
   */
  countryCode: string;
  /**
   * List of supported mobile network operators.
   */
  operatorList: string[];
}

/**
 * Error dictionary for known VAK-SMS error codes.
 */
export const VAK_SMS_ERROR_DESCRIPTIONS: Record<string, string> = {
  apiKeyNotFound: 'API key not found',
  noService: 'Service not found or invalid',
  noNumber: 'No numbers available, try again later',
  noMoney: 'Insufficient funds, please top up balance',
  noCountry: 'Country not found',
  noOperator: 'No operator was found for the requested country',
  badStatus: 'Status not correct',
  idNumNotFound: 'idNum not found',
  badService: 'Incorrect website or service code',
  badData: 'Invalid request data sent',
};

/**
 * Error thrown by the VAK-SMS client when API calls fail.
 */
export class VakSmsError extends Error {
  /**
   * Error code identifier returned by VAK-SMS.
   */
  readonly code?: string;
  /**
   * Raw response payload from the server.
   */
  readonly responseBody?: unknown;

  constructor(message: string, code?: string, responseBody?: unknown) {
    super(message);
    this.name = 'VakSmsError';
    this.code = code;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, VakSmsError.prototype);
  }
}

/**
 * Client for the VAK-SMS temporary number and SMS OTP receiving service.
 */
export class VakSmsClient {
  private readonly apiKey: string;
  private readonly softId: string;
  private readonly http: AxiosInstance;

  /**
   * Creates a new VakSmsClient.
   *
   * @param options - API key string or configuration object.
   *
   * @example
   * ```typescript
   * import { VakSmsClient } from 'vak-sms-client';
   *
   * const client = new VakSmsClient({ apiKey: 'YOUR_API_KEY' });
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance} RUB`);
   * ```
   */
  constructor(options: VakSmsClientOptions | string) {
    if (typeof options === 'string') {
      this.apiKey = options.trim();
      this.softId = DEFAULT_SOFT_ID;
      this.http = axios.create({
        baseURL: 'https://vak-sms.com',
        timeout: 30000,
      });
    } else {
      if (!options || !options.apiKey || !options.apiKey.trim()) {
        throw new VakSmsError('API key is required to initialize VakSmsClient', 'apiKeyNotFound');
      }
      this.apiKey = options.apiKey.trim();
      this.softId = options.softId ?? DEFAULT_SOFT_ID;
      this.http = axios.create({
        baseURL: options.baseURL || 'https://vak-sms.com',
        timeout: options.timeout || 30000,
      });
    }
  }

  /**
   * Retrieves the current account balance.
   *
   * @returns Current balance in RUB.
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log(`Current balance: ${balance}`);
   * ```
   */
  async getBalance(): Promise<number> {
    const data = (await this.request('/api/getBalance/')) as { balance?: number };
    if (typeof data === 'object' && data !== null && typeof data.balance === 'number') {
      return data.balance;
    }
    throw new VakSmsError('Invalid getBalance response', 'INVALID_RESPONSE', data);
  }

  /**
   * Requests a temporary virtual phone number.
   *
   * @param options - Order parameters including service, country, operator, and rental status.
   * @returns Number details with idNum and phone number.
   *
   * @example
   * ```typescript
   * const order = await client.getNumber({
   *   service: 'tg',
   *   country: 'ru',
   * });
   * console.log(`Phone: ${order.tel}, ID: ${order.idNum}`);
   * ```
   */
  async getNumber(options: GetNumberOptions): Promise<VakNumber> {
    const service = Array.isArray(options.service) ? options.service.join(',') : options.service;
    const params: Record<string, string | number> = {
      service,
    };

    if (options.country) params.country = options.country;
    if (options.operator) params.operator = options.operator;
    if (options.rent) params.rent = 'true';

    const softId = options.softId ?? this.softId;
    if (softId) params.softId = softId;

    const data = (await this.request('/api/getNumber/', params)) as {
      tel: string | number;
      idNum: string;
      [key: string]: unknown;
    };

    if (data && data.idNum && data.tel) {
      return {
        idNum: String(data.idNum),
        tel: data.tel,
        service,
        rent: options.rent,
      };
    }

    throw new VakSmsError('Invalid getNumber response', 'INVALID_RESPONSE', data);
  }

  /**
   * Extends the rental duration for an existing number.
   *
   * @param service - Service code.
   * @param tel - Phone number without plus sign (e.g. 79991234567).
   * @param softId - Optional software referral ID.
   * @returns Prolonged number details.
   *
   * @example
   * ```typescript
   * const res = await client.prolongNumber('tg', '79991234567');
   * console.log(`Prolonged ID: ${res.idNum}`);
   * ```
   */
  async prolongNumber(
    service: string,
    tel: string | number,
    softId?: string,
  ): Promise<VakNumber> {
    const params: Record<string, string | number> = {
      service,
      tel,
    };
    const effectiveSoftId = softId ?? this.softId;
    if (effectiveSoftId) params.softId = effectiveSoftId;

    const data = (await this.request('/api/prolongNumber/', params)) as {
      tel: string | number;
      idNum: string;
      [key: string]: unknown;
    };

    if (data && data.idNum && data.tel) {
      return {
        idNum: String(data.idNum),
        tel: data.tel,
        service,
      };
    }

    throw new VakSmsError('Invalid prolongNumber response', 'INVALID_RESPONSE', data);
  }

  /**
   * Retrieves incoming SMS code(s) for an active order.
   *
   * @param idNum - Activation ID returned by getNumber.
   * @param all - Whether to return an array of all received codes.
   * @returns Code string, array of codes, or null if code not yet arrived.
   *
   * @example
   * ```typescript
   * const code = await client.getSmsCode('abcd1234ef');
   * if (code) {
   *   console.log('Received SMS code:', code);
   * }
   * ```
   */
  async getSmsCode(idNum: string, all?: boolean): Promise<string | string[] | null> {
    const params: Record<string, string | number> = { idNum };
    if (all) params.all = 'true';

    const data = (await this.request('/api/getSmsCode/', params)) as {
      smsCode?: string | string[] | null;
    };

    if (data && 'smsCode' in data) {
      return data.smsCode ?? null;
    }
    return null;
  }

  /**
   * Polls until an SMS code arrives or timeout occurs.
   *
   * @param idNum - Activation identifier.
   * @param options - Polling options with timeoutMs (default 120s) and intervalMs (default 3s).
   * @returns Code string or null on timeout.
   *
   * @example
   * ```typescript
   * const code = await client.waitForCode('abcd1234ef', { timeoutMs: 60000 });
   * console.log('Code:', code);
   * ```
   */
  async waitForCode(
    idNum: string,
    options?: { timeoutMs?: number; intervalMs?: number },
  ): Promise<string | null> {
    const timeoutMs = options?.timeoutMs ?? 120000;
    const intervalMs = options?.intervalMs ?? 3000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const res = await this.getSmsCode(idNum);
      if (res) {
        if (Array.isArray(res)) {
          return res[res.length - 1] ?? null;
        }
        return res;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return null;
  }

  /**
   * Updates activation status.
   *
   * Status actions:
   * - 'send': Ready to receive another SMS code
   * - 'end': Successfully complete the activation
   * - 'bad': Ban/report number as defective to release it
   *
   * @param idNum - Activation identifier.
   * @param status - Action name ('send', 'end', 'bad').
   * @returns Status response string.
   *
   * @example
   * ```typescript
   * await client.setStatus('abcd1234ef', 'end');
   * console.log('Activation completed');
   * ```
   */
  async setStatus(idNum: string, status: 'send' | 'end' | 'bad'): Promise<string> {
    const data = (await this.request('/api/setStatus/', {
      idNum,
      status,
    })) as { status?: string };

    if (data && typeof data.status === 'string') {
      return data.status;
    }
    return 'ok';
  }

  /**
   * Checks available phone number quantity and price for a service.
   *
   * @param service - Service code.
   * @param country - Country code (default: 'ru').
   * @param operator - Optional mobile operator filter.
   * @returns Quantity and unit price.
   *
   * @example
   * ```typescript
   * const count = await client.getCountNumber('tg', 'ru');
   * console.log(`Available: ${count.count}, Price: ${count.price} RUB`);
   * ```
   */
  async getCountNumber(
    service: string,
    country: string = 'ru',
    operator?: string,
  ): Promise<CountNumber> {
    const params: Record<string, string | number> = {
      service,
      country,
      price: 1,
    };
    if (operator) params.operator = operator;

    const data = (await this.request('/api/getCountNumber/', params)) as Record<string, unknown>;

    if (data && typeof data === 'object') {
      const countVal = data[service];
      const count = typeof countVal === 'number' ? countVal : 0;
      const price = typeof data.price === 'number' ? data.price : undefined;
      return {
        service,
        count,
        price,
      };
    }

    throw new VakSmsError('Invalid getCountNumber response', 'INVALID_RESPONSE', data);
  }

  /**
   * Retrieves the catalog of supported countries and operators.
   *
   * @returns List of country and operator listings.
   *
   * @example
   * ```typescript
   * const countries = await client.getCountryList();
   * console.log(`Supported countries: ${countries.length}`);
   * ```
   */
  async getCountryList(): Promise<CountryOperator[]> {
    const data = await this.request('/api/getCountryList/');
    if (Array.isArray(data)) {
      return data as CountryOperator[];
    }
    throw new VakSmsError('Invalid getCountryList response', 'INVALID_RESPONSE', data);
  }

  /**
   * Retrieves full catalog of available services and stock for a country.
   *
   * @param country - Country code (default 'ru').
   * @param operator - Optional mobile operator filter.
   * @param rent - Whether to query prolonged rental service stock.
   * @returns Map of services and stock.
   *
   * @example
   * ```typescript
   * const catalog = await client.getCountNumbersList('ru');
   * console.log(catalog);
   * ```
   */
  async getCountNumbersList(
    country: string = 'ru',
    operator?: string,
    rent?: boolean,
  ): Promise<Record<string, unknown>> {
    const params: Record<string, string | number> = {
      country,
    };
    if (operator) params.operator = operator;
    if (rent) params.rent = 'true';

    const data = (await this.request('/api/getCountNumbersList/', params)) as Record<
      string,
      unknown
    >;
    return data && typeof data === 'object' ? data : {};
  }

  private async request(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<unknown> {
    try {
      const response = await this.http.get(endpoint, {
        params: {
          apiKey: this.apiKey,
          ...params,
        },
      });

      const data = response.data;
      if (data && typeof data === 'object') {
        if ('error' in data && data.error) {
          const errCode = String(data.error);
          const desc = VAK_SMS_ERROR_DESCRIPTIONS[errCode] || `VAK-SMS API error: ${errCode}`;
          throw new VakSmsError(desc, errCode, data);
        }
        if ('code' in data && data.code && 'message' in data) {
          throw new VakSmsError(String(data.message), String(data.code), data);
        }
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof VakSmsError) {
        throw err;
      }
      throw new VakSmsError(
        `VAK-SMS request failed: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
      );
    }
  }
}
