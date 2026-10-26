import axios, { AxiosInstance } from 'axios';

/**
 * Default referrer identifier sent on number purchases.
 */
export const DEFAULT_REF_ID = '572438';

/**
 * Configuration options for the SmsBowerClient.
 */
export interface SmsBowerClientOptions {
  /**
   * API key obtained from SMSBower dashboard.
   */
  apiKey: string;
  /**
   * Base URL for the SMSBower API. Defaults to https://smsbower.page.
   */
  baseURL?: string;
  /**
   * Request timeout in milliseconds. Defaults to 30000 ms.
   */
  timeout?: number;
}

/**
 * Options for ordering a virtual phone number.
 */
export interface GetNumberOptions {
  /**
   * Service code (e.g. 'tg' for Telegram, 'wa' for WhatsApp).
   */
  service: string;
  /**
   * Country ID or code (e.g. '22' for India, '1003' for Bermuda).
   */
  country?: string | number;
  /**
   * Maximum acceptable price for purchasing the number.
   */
  maxPrice?: number;
  /**
   * Minimum acceptable price for purchasing the number.
   */
  minPrice?: number;
  /**
   * Whitelist provider IDs (comma-separated string or array of IDs).
   */
  providerIds?: string | number[];
  /**
   * Blacklist provider IDs (comma-separated string or array of IDs).
   */
  exceptProviderIds?: string | number[];
  /**
   * Excluded number prefix masks (e.g. '7918,7900111').
   */
  phoneException?: string;
  /**
   * Reseller user identifier.
   */
  userID?: string | number;
}

/**
 * Acquired virtual phone number from getNumber.
 */
export interface ActivationNumber {
  /**
   * Unique activation ID.
   */
  id: string;
  /**
   * Full phone number with country code.
   */
  number: string;
}

/**
 * Extended activation details returned from getNumberV2.
 */
export interface ActivationNumberV2 {
  /**
   * Activation identifier.
   */
  activationId: string | number;
  /**
   * Full phone number with country code.
   */
  phoneNumber: string | number;
  /**
   * Cost deducted for the activation.
   */
  activationCost?: number;
  /**
   * Country code identifier.
   */
  countryCode?: string | number;
  /**
   * Whether another SMS code can be requested.
   */
  canGetAnotherSms?: boolean | number;
  /**
   * Activation timestamp.
   */
  activationTime?: string;
  /**
   * Mobile operator name or code.
   */
  activationOperator?: string;
  [key: string]: unknown;
}

/**
 * Activation status response.
 */
export interface ActivationStatus {
  /**
   * Raw status code name (e.g. STATUS_WAIT_CODE, STATUS_WAIT_RETRY, STATUS_CANCEL, STATUS_OK).
   */
  status: string;
  /**
   * Received SMS verification code, if available.
   */
  code?: string;
}

/**
 * Service listing item.
 */
export interface ServiceItem {
  /**
   * Service short code (e.g. 'tg', 'kt').
   */
  code: string;
  /**
   * Human-readable service name.
   */
  name: string;
}

/**
 * Country listing item.
 */
export interface CountryItem {
  /**
   * Country numeric identifier.
   */
  id: string | number;
  /**
   * Russian country name.
   */
  rus?: string;
  /**
   * English country name.
   */
  eng?: string;
  /**
   * Chinese country name.
   */
  chn?: string;
}

/**
 * Error thrown by the SMSBower client when API calls fail.
 */
export class SmsBowerError extends Error {
  /**
   * Short error identifier returned by the server (e.g. BAD_KEY, NO_NUMBERS).
   */
  readonly code?: string;
  /**
   * Raw server response body.
   */
  readonly responseBody?: string;

  constructor(message: string, code?: string, responseBody?: string) {
    super(message);
    this.name = 'SmsBowerError';
    this.code = code;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, SmsBowerError.prototype);
  }
}

/**
 * Client for the SMSBower virtual number and SMS activation service.
 */
export class SmsBowerClient {
  private readonly apiKey: string;
  private readonly http: AxiosInstance;

  /**
   * Creates a new SmsBowerClient.
   *
   * @param options - API key string or configuration options.
   *
   * @example
   * ```typescript
   * import { SmsBowerClient } from 'smsbower-client';
   *
   * const client = new SmsBowerClient({ apiKey: 'YOUR_API_KEY' });
   * const balance = await client.getBalance();
   * console.log(`Current balance: $${balance}`);
   * ```
   */
  constructor(options: SmsBowerClientOptions | string) {
    if (typeof options === 'string') {
      this.apiKey = options;
      this.http = axios.create({
        baseURL: 'https://smsbower.page',
        timeout: 30000,
      });
    } else {
      if (!options || !options.apiKey) {
        throw new SmsBowerError('API key is required to initialize SmsBowerClient');
      }
      this.apiKey = options.apiKey;
      this.http = axios.create({
        baseURL: options.baseURL || 'https://smsbower.page',
        timeout: options.timeout || 30000,
      });
    }
  }

  /**
   * Checks the current account balance.
   *
   * @returns Current balance as a float number.
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log('Account balance:', balance);
   * ```
   */
  async getBalance(): Promise<number> {
    const data = await this.sendHandlerRequest({ action: 'getBalance' });
    if (typeof data === 'string' && data.startsWith('ACCESS_BALANCE:')) {
      const balanceStr = data.split(':')[1];
      const balance = parseFloat(balanceStr);
      if (Number.isNaN(balance)) {
        throw new SmsBowerError(`Failed to parse balance: ${data}`, 'PARSE_ERROR', data);
      }
      return balance;
    }
    throw new SmsBowerError(`Unexpected getBalance response: ${data}`, 'INVALID_RESPONSE', String(data));
  }

  /**
   * Orders a new virtual phone number.
   *
   * @param options - Order parameters including service and optional country.
   * @returns Activation details with ID and phone number.
   *
   * @example
   * ```typescript
   * const activation = await client.getNumber({
   *   service: 'tg',
   *   country: '22',
   * });
   * console.log(`Order ID: ${activation.id}, Number: ${activation.number}`);
   * ```
   */
  async getNumber(options: GetNumberOptions): Promise<ActivationNumber> {
    const params: Record<string, string | number> = {
      action: 'getNumber',
      service: options.service,
      ref: DEFAULT_REF_ID,
    };

    if (options.country !== undefined) params.country = options.country;
    if (options.maxPrice !== undefined) params.maxPrice = options.maxPrice;
    if (options.minPrice !== undefined) params.minPrice = options.minPrice;
    if (options.providerIds !== undefined) {
      params.providerIds = Array.isArray(options.providerIds)
        ? options.providerIds.join(',')
        : options.providerIds;
    }
    if (options.exceptProviderIds !== undefined) {
      params.exceptProviderIds = Array.isArray(options.exceptProviderIds)
        ? options.exceptProviderIds.join(',')
        : options.exceptProviderIds;
    }
    if (options.phoneException !== undefined) params.phoneException = options.phoneException;
    if (options.userID !== undefined) params.userID = options.userID;

    const data = await this.sendHandlerRequest(params);
    if (typeof data === 'string' && data.startsWith('ACCESS_NUMBER:')) {
      const parts = data.split(':');
      if (parts.length >= 3) {
        return {
          id: parts[1],
          number: parts[2],
        };
      }
    }
    throw new SmsBowerError(`Unexpected getNumber response: ${data}`, 'INVALID_RESPONSE', String(data));
  }

  /**
   * Orders a new virtual phone number with rich details (v2 protocol).
   *
   * @param options - Order parameters including service and optional country.
   * @returns Detailed activation object.
   *
   * @example
   * ```typescript
   * const details = await client.getNumberV2({
   *   service: 'tg',
   *   country: '22',
   * });
   * console.log(`Number: ${details.phoneNumber}, Cost: ${details.activationCost}`);
   * ```
   */
  async getNumberV2(options: GetNumberOptions): Promise<ActivationNumberV2> {
    const params: Record<string, string | number> = {
      action: 'getNumberV2',
      service: options.service,
      ref: DEFAULT_REF_ID,
    };

    if (options.country !== undefined) params.country = options.country;
    if (options.maxPrice !== undefined) params.maxPrice = options.maxPrice;
    if (options.minPrice !== undefined) params.minPrice = options.minPrice;
    if (options.providerIds !== undefined) {
      params.providerIds = Array.isArray(options.providerIds)
        ? options.providerIds.join(',')
        : options.providerIds;
    }
    if (options.exceptProviderIds !== undefined) {
      params.exceptProviderIds = Array.isArray(options.exceptProviderIds)
        ? options.exceptProviderIds.join(',')
        : options.exceptProviderIds;
    }
    if (options.phoneException !== undefined) params.phoneException = options.phoneException;
    if (options.userID !== undefined) params.userID = options.userID;

    const data = await this.sendHandlerRequest(params);
    if (typeof data === 'object' && data !== null) {
      return data as ActivationNumberV2;
    }
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as ActivationNumberV2;
      } catch {
        throw new SmsBowerError(`Unexpected getNumberV2 response: ${data}`, 'INVALID_RESPONSE', data);
      }
    }
    throw new SmsBowerError(`Unexpected getNumberV2 response: ${data}`, 'INVALID_RESPONSE', String(data));
  }

  /**
   * Checks the status and retrieves the received SMS code for an activation.
   *
   * @param id - Activation identifier.
   * @returns Current status and code if received.
   *
   * @example
   * ```typescript
   * const res = await client.getStatus('123456');
   * if (res.status === 'STATUS_OK') {
   *   console.log('Received SMS code:', res.code);
   * }
   * ```
   */
  async getStatus(id: string | number): Promise<ActivationStatus> {
    const data = await this.sendHandlerRequest({
      action: 'getStatus',
      id,
    });

    if (typeof data === 'string') {
      if (data.startsWith('STATUS_OK:')) {
        return {
          status: 'STATUS_OK',
          code: data.substring('STATUS_OK:'.length).trim(),
        };
      }
      if (data.startsWith('STATUS_WAIT_RETRY:')) {
        return {
          status: 'STATUS_WAIT_RETRY',
          code: data.substring('STATUS_WAIT_RETRY:'.length).trim(),
        };
      }
      return { status: data.trim() };
    }
    throw new SmsBowerError(`Unexpected getStatus response: ${data}`, 'INVALID_RESPONSE', String(data));
  }

  /**
   * Changes the activation status.
   * Status actions:
   * - 1: Inform readiness of the number (SMS sent)
   * - 3: Request another code
   * - 6: Complete activation
   * - 8: Cancel activation
   *
   * @param id - Activation identifier.
   * @param status - Action code (1, 3, 6, 8).
   * @returns Status confirmation response string.
   *
   * @example
   * ```typescript
   * await client.setStatus('123456', 6);
   * console.log('Activation completed');
   * ```
   */
  async setStatus(id: string | number, status: number): Promise<string> {
    const data = await this.sendHandlerRequest({
      action: 'setStatus',
      id,
      status,
    });
    return String(data).trim();
  }

  /**
   * Gets prices and counts for services and countries.
   *
   * @param service - Optional service code filter.
   * @param country - Optional country code filter.
   * @returns Price mapping.
   *
   * @example
   * ```typescript
   * const prices = await client.getPrices('tg', '22');
   * console.log(prices);
   * ```
   */
  async getPrices(
    service?: string,
    country?: string | number,
  ): Promise<Record<string, Record<string, { cost: number; count: number }>>> {
    const params: Record<string, string | number> = { action: 'getPrices' };
    if (service) params.service = service;
    if (country !== undefined) params.country = country;
    return (await this.sendHandlerRequest(params)) as Record<
      string,
      Record<string, { cost: number; count: number }>
    >;
  }

  /**
   * Gets detailed price lists grouped by price point (v2).
   *
   * @param service - Optional service code filter.
   * @param country - Optional country code filter.
   * @returns Price points mapping.
   *
   * @example
   * ```typescript
   * const pricesV2 = await client.getPricesV2('tg', '22');
   * console.log(pricesV2);
   * ```
   */
  async getPricesV2(
    service?: string,
    country?: string | number,
  ): Promise<Record<string, Record<string, Record<string, number>>>> {
    const params: Record<string, string | number> = { action: 'getPricesV2' };
    if (service) params.service = service;
    if (country !== undefined) params.country = country;
    return (await this.sendHandlerRequest(params)) as Record<
      string,
      Record<string, Record<string, number>>
    >;
  }

  /**
   * Gets granular price lists by provider ID (v3).
   *
   * @param service - Optional service code filter.
   * @param country - Optional country code filter.
   * @returns Provider price mapping.
   *
   * @example
   * ```typescript
   * const pricesV3 = await client.getPricesV3('tg', '22');
   * console.log(pricesV3);
   * ```
   */
  async getPricesV3(
    service?: string,
    country?: string | number,
  ): Promise<
    Record<
      string,
      Record<string, Record<string, { count: number; price: number; provider_id: number | string }>>
    >
  > {
    const params: Record<string, string | number> = { action: 'getPricesV3' };
    if (service) params.service = service;
    if (country !== undefined) params.country = country;
    return (await this.sendHandlerRequest(params)) as Record<
      string,
      Record<string, Record<string, { count: number; price: number; provider_id: number | string }>>
    >;
  }

  /**
   * Retrieves the full catalog of supported services.
   *
   * @returns Array of available services.
   *
   * @example
   * ```typescript
   * const services = await client.getServicesList();
   * console.log(`Found ${services.length} services`);
   * ```
   */
  async getServicesList(): Promise<ServiceItem[]> {
    const data = (await this.sendHandlerRequest({ action: 'getServicesList' })) as {
      status?: string;
      services?: ServiceItem[];
    };
    if (data && Array.isArray(data.services)) {
      return data.services;
    }
    if (Array.isArray(data)) {
      return data as ServiceItem[];
    }
    return [];
  }

  /**
   * Retrieves the full catalog of available countries.
   *
   * @returns Mapping of country IDs to country metadata.
   *
   * @example
   * ```typescript
   * const countries = await client.getCountries();
   * console.log('Country 22:', countries['22']);
   * ```
   */
  async getCountries(): Promise<Record<string, CountryItem>> {
    const data = await this.sendHandlerRequest({ action: 'getCountries' });
    return data as Record<string, CountryItem>;
  }

  /**
   * Retrieves the top 10 countries and gold partners for a service.
   *
   * @param service - Service code.
   * @returns Top countries and partner listings.
   *
   * @example
   * ```typescript
   * const top = await client.getTopCountriesByService('tg');
   * console.log(top);
   * ```
   */
  async getTopCountriesByService(service: string): Promise<Record<string, unknown>> {
    const data = await this.sendHandlerRequest({
      action: 'getTopCountriesByService',
      service,
    });
    return data as Record<string, unknown>;
  }

  /**
   * Retrieves static wallet address for crypto deposits.
   *
   * @param coin - Cryptocurrency symbol (e.g. 'usdt', 'trx').
   * @param network - Blockchain network (e.g. 'tron').
   * @returns Wallet address response.
   *
   * @example
   * ```typescript
   * const wallet = await client.getActualWalletAddress('usdt', 'tron');
   * console.log('Deposit address:', wallet.wallet_address);
   * ```
   */
  async getActualWalletAddress(
    coin: string,
    network: string,
  ): Promise<{ wallet_address: string }> {
    try {
      const response = await this.http.get('/api/payment/getActualWalletAddress', {
        params: {
          api_key: this.apiKey,
          coin,
          network,
        },
      });
      return response.data;
    } catch (err: unknown) {
      if (err instanceof SmsBowerError) {
        throw err;
      }
      throw new SmsBowerError(
        `getActualWalletAddress request failed: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
      );
    }
  }

  private async sendHandlerRequest(
    params: Record<string, string | number>,
  ): Promise<unknown> {
    try {
      const query: Record<string, string | number> = {
        api_key: this.apiKey,
        ...params,
      };
      const response = await this.http.get('/stubs/handler_api.php', {
        params: query,
        responseType: 'text',
      });

      let body: unknown = response.data;
      if (typeof body === 'string') {
        const trimmed = body.trim();
        const errorKeywords = [
          'BAD_KEY',
          'BAD_ACTION',
          'BAD_SERVICE',
          'NO_NUMBERS',
          'NO_BALANCE',
          'NO_ACTIVATION',
          'BAD_STATUS',
          'EARLY_CANCEL_DENIED',
          'BAD_COUNTRY',
        ];
        for (const kw of errorKeywords) {
          if (trimmed === kw || trimmed.startsWith(`${kw}:`)) {
            throw new SmsBowerError(`SMSBower API error: ${trimmed}`, kw, trimmed);
          }
        }

        if (
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
          try {
            body = JSON.parse(trimmed);
          } catch {
            // Keep as string if JSON parsing fails
          }
        }
      }

      return body;
    } catch (err: unknown) {
      if (err instanceof SmsBowerError) {
        throw err;
      }
      throw new SmsBowerError(
        `SMSBower request failed: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
      );
    }
  }
}
