import type { AxiosInstance } from "axios";

/** Options for configuring the Peak client. */
export interface PeakOptions {
  /** API key from the Peak dashboard (`pk_...`). */
  apiKey: string;

  /** Base URL for Peak API. Defaults to `https://api.peak.fo`. */
  baseUrl?: string;

  /** Request timeout in milliseconds. Defaults to 60000ms. */
  timeoutMs?: number;

  /** Custom Axios instance, useful for testing or custom proxies. */
  axios?: AxiosInstance;
}

/** Balance details for a pay-per-solve account. */
export interface PayPerSolveBalance {
  type: "pay_per_solve";
  balance: number;
}

/** Balance details for a package/subscription account. */
export interface PackageBalance {
  type: "package";
  package: string;
  expires_at: string;
  days_remaining: number;
}

/** Account balance information. */
export type BalanceData = PayPerSolveBalance | PackageBalance;

/** Response returned by `GET /balance`. */
export interface BalanceResponse {
  success: boolean;
  data: BalanceData;
}

/** Parameters for solving a Cloudflare Turnstile challenge. */
export interface SolveTurnstileParams {
  /** Target page URL (recommended with trailing slash). */
  url: string;

  /** Cloudflare Turnstile sitekey. */
  sitekey: string;

  /** Turnstile action value, if configured on the target site. */
  action?: string;

  /** Turnstile cdata value, if configured on the target site. */
  cdata?: string;

  /**
   * Proxy in `http://user:pass@ip:port` format.
   * If omitted, proxyless mode (`TurnstileTaskProxyLess`) will be used.
   */
  proxy?: string;
}

/** Result of solving a Turnstile challenge. */
export interface TurnstileResult {
  /** The generated `cf-turnstile-response` token. */
  token: string;
}

/** Parameters for solving a Cloudflare 5-second challenge (WAF / Under Attack mode). */
export interface SolveCloudflare5sParams {
  /** Target page URL (must end with a trailing slash `/`). */
  url: string;

  /** Sticky proxy in `http://user:pass@ip:port` format. */
  proxy: string;

  /** Windows Chrome user-agent string. */
  userAgent?: string;

  /** Optional pre-fetched HTML to skip initial fetch. */
  html?: string;
}

/** Result of solving a Cloudflare 5-second challenge. */
export interface Cloudflare5sResult {
  /** Clear clearance cookies to apply to your HTTP session. */
  cookies: Record<string, string>;

  /** Required headers, including exact user-agent to use. */
  headers: {
    "user-agent"?: string;
    [key: string]: string | undefined;
  };

  /** Form attributes to POST to target URL. */
  attributes: {
    md: string;
    r: string;
  };

  /** Challenge token for the Referer header (`{url}?__cf_chl_tk={cf_rt}`). */
  cf_rt: string;
}

/** Raw API envelope returned by Peak endpoints. */
export interface RawApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
