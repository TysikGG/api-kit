/**
 * Configuration options for the XMLStock client.
 */
export interface XmlStockOptions {
  /**
   * XMLStock User ID from dashboard.
   */
  user: string | number;

  /**
   * XMLStock API key from dashboard.
   */
  apiKey: string;

  /**
   * Base URL for the XMLStock API. Defaults to https://xmlstock.com.
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds. Defaults to 30000 ms.
   */
  timeout?: number;
}

/**
 * Account balance and limits information.
 */
export interface BalanceResponse {
  balance?: number;
  currency?: string;
  [key: string]: unknown;
}

/**
 * Options for querying Yandex search results.
 */
export interface YandexSearchOptions {
  /**
   * Region ID (e.g. 213 for Moscow, 225 for Russia).
   */
  lr?: number;

  /**
   * Number of results per page (multiples of 10, up to 100).
   */
  groupby?: number;

  /**
   * Page number starting from 0.
   */
  page?: number;

  /**
   * Search domain zone (e.g. 'ru', 'com', 'by', 'kz', 'com.tr').
   */
  domain?: string;

  /**
   * Safe search filter level.
   */
  filter?: 'none' | 'moderate' | 'strict';

  /**
   * Device layout type.
   */
  device?: 'desktop' | 'mobile';

  /**
   * Sort by relevance ('rlv') or chronological date ('tm').
   */
  sortby?: 'rlv' | 'tm';

  /**
   * Number of passages per document (1-5).
   */
  maxpassages?: number;

  /**
   * Additional custom GET parameters.
   */
  [key: string]: unknown;
}

/**
 * Options for querying Google search results.
 */
export interface GoogleSearchOptions {
  /**
   * Region ID (e.g. 213 for Moscow).
   */
  lr?: number;

  /**
   * Country code (e.g. 'ru', 'us', 'de').
   */
  country?: string;

  /**
   * Number of results per page (multiples of 10, up to 100).
   */
  groupby?: number;

  /**
   * Page number starting from 0.
   */
  page?: number;

  /**
   * Search domain zone (e.g. 'ru', 'com').
   */
  domain?: string;

  /**
   * Safe search filter ('off', 'on', 'active').
   */
  safe?: 'off' | 'on' | 'active';

  /**
   * Duplicate / similar results filter ('0' or '1').
   */
  filter?: '0' | '1';

  /**
   * Interface language code ('ru', 'en', etc.).
   */
  hl?: string;

  /**
   * Device layout type.
   */
  device?: 'desktop' | 'mobile';

  /**
   * Additional custom GET parameters.
   */
  [key: string]: unknown;
}

/**
 * Options for querying Yandex Wordstat keyword frequency data.
 */
export interface WordstatOptions {
  /**
   * Report page type ('words', 'regions', 'dynamics'). Defaults to 'words'.
   */
  pagetype?: 'words' | 'regions' | 'dynamics' | string;

  /**
   * Region IDs separated by comma or array.
   */
  regions?: string | number | (string | number)[];

  /**
   * Additional custom GET parameters.
   */
  [key: string]: unknown;
}
