import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { XmlStockError } from './errors.js';
import {
  BalanceResponse,
  GoogleSearchOptions,
  WordstatOptions,
  XmlStockOptions,
  YandexSearchOptions,
} from './types.js';

/** @internal */
export const DEFAULT_SOFT_ID = '7ee4fabf80ee75b2c5bfa100f8fe169f';

/**
 * Client for the XMLStock search engine API (Yandex XML, Google XML, and Wordstat).
 */
export class XmlStockClient {
  private readonly user: string | number;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly client: AxiosInstance;

  /**
   * Initializes a new instance of the XmlStockClient.
   *
   * @param options Configuration options including user ID and API key.
   *
   * @example
   * ```typescript
   * import { XmlStockClient } from 'xmlstock';
   *
   * const client = new XmlStockClient({
   *   user: '12345',
   *   apiKey: 'your_api_key_here',
   * });
   * ```
   */
  constructor(options: XmlStockOptions) {
    if (!options.user) {
      throw new XmlStockError('User ID is required', 'MISSING_USER');
    }
    if (!options.apiKey) {
      throw new XmlStockError('API key is required', 'MISSING_API_KEY');
    }

    this.user = options.user;
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'https://xmlstock.com').replace(/\/+$/, '');

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout ?? 30000,
    });
  }

  /**
   * Retrieves the current account balance, limits, and tariff details.
   * This is a free service call that does not consume search limits.
   *
   * @returns Account balance details.
   *
   * @example
   * ```typescript
   * const balanceInfo = await client.getBalance();
   * console.log('Current balance:', balanceInfo.balance);
   * ```
   */
  public async getBalance(): Promise<BalanceResponse> {
    const params: Record<string, unknown> = {
      do: 'balance',
      user: this.user,
      key: this.apiKey,
      soft_id: DEFAULT_SOFT_ID,
    };

    let response: AxiosResponse;
    try {
      response = await this.client.get('/api/', { params });
    } catch (err: unknown) {
      this.handleAxiosError(err);
    }

    const data = response.data;
    if (typeof data === 'string') {
      if (data.startsWith('ERROR_')) {
        throw new XmlStockError(`XMLStock balance error: ${data}`, data, response.status, data);
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          if ('error' in parsed && parsed.error) {
            throw new XmlStockError(String(parsed.error), 'API_ERROR', response.status, parsed);
          }
          return parsed as BalanceResponse;
        }
      } catch (jsonErr) {
        if (jsonErr instanceof XmlStockError) throw jsonErr;
      }
      return { raw: data } as BalanceResponse;
    }

    if (data && typeof data === 'object') {
      const errText = (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).Error;
      if (errText !== undefined && errText !== null && errText !== '') {
        throw new XmlStockError(`XMLStock balance error: ${String(errText)}`, 'API_ERROR', response.status, data);
      }
      return data as BalanceResponse;
    }

    throw new XmlStockError('Invalid response format from XMLStock balance API', 'INVALID_RESPONSE', response.status, data);
  }

  /**
   * Performs an automated search query via Yandex XML Proxy.
   *
   * @param query Search query string.
   * @param options Optional search parameters such as region ID (lr), page, and safe search filter.
   * @returns Raw XML string response from Yandex XML.
   *
   * @example
   * ```typescript
   * const xml = await client.searchYandex('buy laptop', { lr: 213, groupby: 10 });
   * console.log('Yandex XML response:', xml);
   * ```
   */
  public async searchYandex(query: string, options?: YandexSearchOptions): Promise<string> {
    return this.executeSearch('/yandex/xml/', query, options);
  }

  /**
   * Performs a live real-time search query via Yandex Live XML.
   *
   * @param query Search query string.
   * @param options Optional search parameters.
   * @returns Raw XML string response from Yandex Live.
   *
   * @example
   * ```typescript
   * const xml = await client.searchYandexLive('apple macbook pro', { lr: 213 });
   * console.log('Live Yandex XML response:', xml);
   * ```
   */
  public async searchYandexLive(query: string, options?: YandexSearchOptions): Promise<string> {
    return this.executeSearch('/yandexlive/xml/', query, options);
  }

  /**
   * Performs an automated SERP search query via Google XML Search.
   *
   * @param query Search query string.
   * @param options Optional search parameters such as country code, safe search, and pagination.
   * @returns Raw XML string response from Google XML.
   *
   * @example
   * ```typescript
   * const xml = await client.searchGoogle('best open source mcp servers', { domain: 'com' });
   * console.log('Google XML response:', xml);
   * ```
   */
  public async searchGoogle(query: string, options?: GoogleSearchOptions): Promise<string> {
    return this.executeSearch('/google/xml/', query, options);
  }

  /**
   * Queries keyword statistics and search volumes via Yandex Wordstat API.
   *
   * @param words Single keyword or array of keywords.
   * @param options Optional parameters such as report type (pagetype) and regions.
   * @returns Parsed JSON response from Wordstat.
   *
   * @example
   * ```typescript
   * const stats = await client.getWordstat(['seo audit', 'rank tracker'], { pagetype: 'words' });
   * console.log('Wordstat stats:', stats);
   * ```
   */
  public async getWordstat(
    words: string | string[],
    options?: WordstatOptions
  ): Promise<Record<string, unknown>> {
    const wordParam = Array.isArray(words) ? words.join(',') : words;
    const params: Record<string, unknown> = {
      user: this.user,
      key: this.apiKey,
      words: wordParam,
      pagetype: options?.pagetype ?? 'words',
      soft_id: DEFAULT_SOFT_ID,
      ...options,
    };

    let response: AxiosResponse;
    try {
      response = await this.client.get('/wordstat/json/', { params });
    } catch (err: unknown) {
      this.handleAxiosError(err);
    }

    const data = response.data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        this.checkWordstatError(parsed, response.status);
        return parsed;
      } catch (jsonErr) {
        if (jsonErr instanceof XmlStockError) throw jsonErr;
        throw new XmlStockError(`Invalid JSON from Wordstat: ${data}`, 'INVALID_RESPONSE', response.status, data);
      }
    }

    if (data && typeof data === 'object') {
      this.checkWordstatError(data, response.status);
      return data as Record<string, unknown>;
    }

    throw new XmlStockError('Invalid response from Wordstat API', 'INVALID_RESPONSE', response.status, data);
  }

  private async executeSearch(
    endpoint: string,
    query: string,
    options?: Record<string, unknown>
  ): Promise<string> {
    if (!query) {
      throw new XmlStockError('Search query cannot be empty', 'MISSING_QUERY');
    }

    const params: Record<string, unknown> = {
      user: this.user,
      key: this.apiKey,
      query,
      soft_id: DEFAULT_SOFT_ID,
      ...options,
    };

    let response: AxiosResponse<string>;
    try {
      response = await this.client.get<string>(endpoint, {
        params,
        responseType: 'text',
      });
    } catch (err: unknown) {
      this.handleAxiosError(err);
    }

    const text = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    this.checkXmlError(text, response.status);
    return text;
  }

  private checkXmlError(xml: string, status?: number): void {
    const errorMatch = /<error\b[^>]*code="([^"]+)"[^>]*>([\s\S]*?)<\/error>/i.exec(xml);
    if (errorMatch) {
      const code = errorMatch[1];
      const message = errorMatch[2].trim();
      throw new XmlStockError(`XMLStock API error (${code}): ${message}`, code, status, xml);
    }

    if (xml.startsWith('ERROR_')) {
      throw new XmlStockError(`XMLStock API error: ${xml.trim()}`, xml.trim(), status, xml);
    }
  }

  private checkWordstatError(data: unknown, status?: number): void {
    if (data && typeof data === 'object' && 'error' in data) {
      const err = (data as Record<string, unknown>).error;
      if (err && typeof err === 'object') {
        const code = (err as Record<string, unknown>).code;
        const msg = (err as Record<string, unknown>).message;
        throw new XmlStockError(
          `XMLStock Wordstat error: ${String(msg || 'Unknown error')}`,
          code !== undefined ? String(code) : 'WORDSTAT_ERROR',
          status,
          data
        );
      }
      if (err) {
        throw new XmlStockError(`XMLStock Wordstat error: ${String(err)}`, 'WORDSTAT_ERROR', status, data);
      }
    }
  }

  private handleAxiosError(err: unknown): never {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;
      const message =
        (typeof data === 'object' && data && 'error' in data ? String(data.error) : null) ||
        (typeof data === 'string' && data ? data : null) ||
        err.message;
      throw new XmlStockError(`HTTP error: ${message}`, err.code, status, data);
    }
    if (err instanceof XmlStockError) {
      throw err;
    }
    throw new XmlStockError(err instanceof Error ? err.message : String(err));
  }
}
