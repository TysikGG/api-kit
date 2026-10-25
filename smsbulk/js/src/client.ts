import axios, { AxiosError, AxiosInstance } from "axios";
import { SMSBulkError } from "./errors.js";
import type {
  Activation,
  ActivationListResponse,
  BalanceResponse,
  CountriesResponse,
  CountryCatalogItem,
  CreateActivationParams,
  CreateEmailActivationParams,
  EmailActivation,
  EmailActivationListResponse,
  EmailDomainItem,
  SMSBulkClientOptions,
  ServiceCatalogItem,
  ServiceCountriesResponse,
  ServicesResponse,
  TransactionListResponse,
} from "./types.js";

export const REF_ID = "3XTTWRX9";

/**
 * Client for interacting with the SMSBulk API.
 */
export class SMSBulk {
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  /**
   * Creates an instance of the SMSBulk client.
   *
   * @example
   * ```typescript
   * import { SMSBulk } from "smsbulk-client";
   *
   * const client = new SMSBulk({ apiKey: "your-api-key" });
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance.balance} ${balance.currency}`);
   * ```
   */
  constructor(options: SMSBulkClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.SMSBULK_API_KEY;
    const baseURL = options.baseURL || "https://smsbulk.net/api";
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "smsbulk-client/0.1.0";

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    this.http = axios.create({
      baseURL,
      timeout,
      headers,
    });
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    options?: { params?: Record<string, unknown>; data?: unknown }
  ): Promise<T> {
    try {
      const response = await this.http.request<T>({
        method,
        url: path,
        params: options?.params,
        data: options?.data,
      });
      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{
          message?: string;
          error?: string;
          statusCode?: number;
          [key: string]: unknown;
        }>;
        const data = axiosErr.response?.data;
        const status = axiosErr.response?.status;
        const message =
          (typeof data === "object" && data !== null && (data.message || data.error)) ||
          axiosErr.message ||
          "SMSBulk API error";
        const code = typeof data === "object" && data !== null ? data.error : undefined;

        throw new SMSBulkError(String(message), {
          statusCode: status,
          code: code ? String(code) : undefined,
          responseBody: data,
        });
      }
      throw new SMSBulkError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Retrieves current wallet balance.
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance.balance} ${balance.currency}`);
   * ```
   */
  async getBalance(): Promise<BalanceResponse> {
    return this.request<BalanceResponse>("GET", "/v1/wallet/balance");
  }

  /**
   * Lists wallet transactions with optional pagination.
   *
   * @example
   * ```typescript
   * const { data, nextCursor } = await client.getTransactions({ limit: 10 });
   * console.log(`Fetched ${data.length} transactions`);
   * ```
   */
  async getTransactions(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<TransactionListResponse> {
    return this.request<TransactionListResponse>("GET", "/v1/wallet/transactions", {
      params,
    });
  }

  /**
   * Lists all available services in the catalog.
   *
   * @example
   * ```typescript
   * const { data } = await client.getServices();
   * console.log(`Available services: ${data.length}`);
   * ```
   */
  async getServices(): Promise<ServicesResponse> {
    return this.request<ServicesResponse>("GET", "/v1/services");
  }

  /**
   * Gets details for a single service by slug.
   *
   * @example
   * ```typescript
   * const service = await client.getService("whatsapp");
   * console.log(`Service name: ${service.name}`);
   * ```
   */
  async getService(slug: string): Promise<ServiceCatalogItem> {
    return this.request<ServiceCatalogItem>("GET", `/v1/services/${encodeURIComponent(slug)}`);
  }

  /**
   * Lists in-stock countries and prices for a service.
   *
   * @example
   * ```typescript
   * const { countries } = await client.getServiceCountries("whatsapp");
   * console.log(`Countries offering WhatsApp: ${countries.length}`);
   * ```
   */
  async getServiceCountries(slug: string): Promise<ServiceCountriesResponse> {
    return this.request<ServiceCountriesResponse>(
      "GET",
      `/v1/services/${encodeURIComponent(slug)}/countries`
    );
  }

  /**
   * Lists all supported countries.
   *
   * @example
   * ```typescript
   * const { data } = await client.getCountries();
   * console.log(`Total countries: ${data.length}`);
   * ```
   */
  async getCountries(): Promise<CountriesResponse> {
    return this.request<CountriesResponse>("GET", "/v1/countries");
  }

  /**
   * Reserves a virtual number for SMS verification.
   *
   * @example
   * ```typescript
   * const activation = await client.createActivation({
   *   serviceCode: "wa",
   *   countryIso: "US",
   * });
   * console.log(`Reserved phone number: ${activation.phoneNumber}`);
   * ```
   */
  async createActivation(params: CreateActivationParams): Promise<Activation> {
    const payload = {
      serviceCode: params.serviceCode,
      countryIso: params.countryIso,
      ...(params.operator !== undefined && { operator: params.operator }),
      ...(params.maxPrice !== undefined && { maxPrice: params.maxPrice }),
      ref_id: REF_ID,
    };
    return this.request<Activation>("POST", "/v1/activations", { data: payload });
  }

  /**
   * Lists activations belonging to the user.
   *
   * @example
   * ```typescript
   * const { data } = await client.getActivations({ limit: 20 });
   * console.log(`Active purchases: ${data.length}`);
   * ```
   */
  async getActivations(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<ActivationListResponse> {
    return this.request<ActivationListResponse>("GET", "/v1/activations", {
      params,
    });
  }

  /**
   * Gets details and received SMS code for an activation.
   *
   * @example
   * ```typescript
   * const act = await client.getActivation("activation-id");
   * if (act.status === "RECEIVED") {
   *   console.log(`Received code: ${act.smsCode}`);
   * }
   * ```
   */
  async getActivation(id: string): Promise<Activation> {
    return this.request<Activation>("GET", `/v1/activations/${encodeURIComponent(id)}`);
  }

  /**
   * Cancels an activation and refunds the balance.
   *
   * @example
   * ```typescript
   * const act = await client.cancelActivation("activation-id");
   * console.log(`Status after cancellation: ${act.status}`);
   * ```
   */
  async cancelActivation(id: string): Promise<Activation> {
    return this.request<Activation>("DELETE", `/v1/activations/${encodeURIComponent(id)}`);
  }

  /**
   * Marks an activation as completed.
   *
   * @example
   * ```typescript
   * const act = await client.completeActivation("activation-id");
   * console.log(`Activation completed: ${act.status}`);
   * ```
   */
  async completeActivation(id: string): Promise<Activation> {
    return this.request<Activation>(
      "POST",
      `/v1/activations/${encodeURIComponent(id)}/complete`
    );
  }

  /**
   * Requests a resend of another SMS code for the existing number.
   *
   * @example
   * ```typescript
   * const act = await client.resendActivation("activation-id");
   * console.log(`Resend requested: ${act.status}`);
   * ```
   */
  async resendActivation(id: string): Promise<Activation> {
    return this.request<Activation>(
      "POST",
      `/v1/activations/${encodeURIComponent(id)}/request-resend`
    );
  }

  /**
   * Lists available email domains and pricing for a given site.
   *
   * @example
   * ```typescript
   * const domains = await client.getEmailDomains("telegram.com");
   * console.log(`Available domains: ${domains.map((d) => d.name).join(", ")}`);
   * ```
   */
  async getEmailDomains(site: string): Promise<EmailDomainItem[]> {
    return this.request<EmailDomainItem[]>("GET", "/v1/email-activations/domains", {
      params: { site },
    });
  }

  /**
   * Purchases a temporary email address.
   *
   * @example
   * ```typescript
   * const act = await client.createEmailActivation({
   *   site: "telegram.com",
   *   domain: "gmx.com",
   * });
   * console.log(`Purchased email: ${act.emailAddress}`);
   * ```
   */
  async createEmailActivation(
    params: CreateEmailActivationParams
  ): Promise<EmailActivation> {
    return this.request<EmailActivation>("POST", "/v1/email-activations", {
      data: params,
    });
  }

  /**
   * Lists email activations belonging to the user.
   *
   * @example
   * ```typescript
   * const { data } = await client.getEmailActivations({ limit: 10 });
   * console.log(`Email activations: ${data.length}`);
   * ```
   */
  async getEmailActivations(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<EmailActivationListResponse> {
    return this.request<EmailActivationListResponse>(
      "GET",
      "/v1/email-activations",
      { params }
    );
  }

  /**
   * Gets details and received email content for an email activation.
   *
   * @example
   * ```typescript
   * const act = await client.getEmailActivation("email-act-id");
   * if (act.status === "RECEIVED") {
   *   console.log(`OTP Code: ${act.otpValue}`);
   * }
   * ```
   */
  async getEmailActivation(id: string): Promise<EmailActivation> {
    return this.request<EmailActivation>(
      "GET",
      `/v1/email-activations/${encodeURIComponent(id)}`
    );
  }

  /**
   * Cancels an email activation.
   *
   * @example
   * ```typescript
   * const act = await client.cancelEmailActivation("email-act-id");
   * console.log(`Cancelled: ${act.status}`);
   * ```
   */
  async cancelEmailActivation(id: string): Promise<EmailActivation> {
    return this.request<EmailActivation>(
      "DELETE",
      `/v1/email-activations/${encodeURIComponent(id)}`
    );
  }

  /**
   * Reorders (re-opens) an email address for further verification codes.
   *
   * @example
   * ```typescript
   * const act = await client.reorderEmailActivation("email-act-id");
   * console.log(`Reordered: ${act.status}`);
   * ```
   */
  async reorderEmailActivation(id: string): Promise<EmailActivation> {
    return this.request<EmailActivation>(
      "POST",
      `/v1/email-activations/${encodeURIComponent(id)}/reorder`
    );
  }
}
