import axios, { type AxiosError, type AxiosInstance } from "axios";
import { AuthenticationError, createGreedySMSError } from "./errors.js";
import type {
  ActivationAction,
  ActivationStatusResponse,
  CancelMailOrderResponse,
  ContinuedRentNumber,
  GetCountriesResponse,
  GetHistoryOptions,
  GetHistoryResponse,
  GetMailOrdersResponse,
  GetNumberOptions,
  GetNumbersStatusOptions,
  GetNumbersStatusResponse,
  GetPricesOptions,
  GetPricesResponse,
  GetRentListResponse,
  GetRentNumberOptions,
  GetRentPricesOptions,
  GetRentStatusOptions,
  GetRentStatusResponse,
  GetServicesOptions,
  GetServicesResponse,
  GetTopCountriesOptions,
  GetTopCountriesResponse,
  GreedySMSOptions,
  HealthResponse,
  MailDomainItem,
  MailPriceQuote,
  MailStatusResponse,
  OperatorCountryInfo,
  OrderedMailDomain,
  OrderedNumber,
  OrderedRentNumber,
  PaginationOptions,
  TopCountryPriceItem,
  UserInfo,
} from "./types.js";

/** Default base URL for Greedy SMS API */
export const DEFAULT_BASE_URL = "https://api.greedy-sms.com";

/**
 * Greedy SMS API Client
 *
 * Official TypeScript client for the Greedy SMS REST API (https://api.greedy-sms.com/docs).
 *
 * @example
 * ```typescript
 * import { GreedySMS } from "greedy-sms";
 *
 * const client = new GreedySMS({ apiKey: "your-api-key" });
 * const me = await client.getMe();
 * console.log(`Balance: ${me.balance} RUB`);
 * ```
 */
export class GreedySMS {
  private readonly apiKey: string;
  private readonly httpClient: AxiosInstance;

  /**
   * Initializes a new Greedy SMS client.
   *
   * @param options - API key string or configuration object.
   *
   * @example
   * ```typescript
   * const client = new GreedySMS("my-api-key");
   * // or
   * const client = new GreedySMS({ apiKey: "my-api-key" });
   * ```
   */
  constructor(options?: string | (GreedySMSOptions & { axios?: AxiosInstance })) {
    const config = typeof options === "string" ? { apiKey: options } : options || {};
    const key = (config.apiKey || process.env.GREEDY_SMS_API_KEY || "").trim();

    if (!key) {
      throw new AuthenticationError("API key is required");
    }

    this.apiKey = key;
    this.httpClient =
      config.axios ??
      axios.create({
        baseURL: (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ""),
        timeout: config.timeout || 30000,
      });
  }

  /**
   * Internal request dispatcher with structured error handling.
   */
  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await this.httpClient.request<T>({
        method,
        url: path,
        data: body,
        params,
        headers: {
          "x-api-key": this.apiKey,
          "content-type": "application/json",
        },
      });
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        throw createGreedySMSError(axiosErr.response.status, axiosErr.response.data);
      }
      throw err;
    }
  }

  // ============================================================================
  // System & User
  // ============================================================================

  /**
   * Check if the API process is running and accepting requests.
   *
   * @returns Health status object { status: 'ok' }
   *
   * @example
   * ```typescript
   * const health = await client.checkHealth();
   * console.log(health.status); // 'ok'
   * ```
   */
  public async checkHealth(): Promise<HealthResponse> {
    const response = await this.httpClient.get<HealthResponse>("/health/live");
    return response.data;
  }

  /**
   * Get current user profile, balance, referral balance, purchases, and discount tiers.
   *
   * @returns User profile details
   *
   * @example
   * ```typescript
   * const me = await client.getMe();
   * console.log(`Balance: ${me.balance} RUB, Discount: ${me.discount.percent}%`);
   * ```
   */
  public async getMe(): Promise<UserInfo> {
    return this.request<UserInfo>("GET", "/users/getMe");
  }

  /**
   * Convenience method to fetch current account balance in rubles.
   *
   * @returns Balance in rubles
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance} RUB`);
   * ```
   */
  public async getBalance(): Promise<number> {
    const user = await this.getMe();
    return user.balance;
  }

  // ============================================================================
  // Activations: Catalog & Directories
  // ============================================================================

  /**
   * Get telecom mobile operators by country.
   *
   * @param country - Optional country ID filter
   * @returns Array of country-operator mappings
   *
   * @example
   * ```typescript
   * const operators = await client.getOperators(0);
   * ```
   */
  public async getOperators(country?: number): Promise<OperatorCountryInfo[]> {
    const body: Record<string, unknown> = {};
    if (country !== undefined) body.country = country;
    return this.request<OperatorCountryInfo[]>("POST", "/activations/getOperators", body);
  }

  /**
   * List available countries with localized titles and pagination.
   *
   * @param options - Pagination options (page, pageSize)
   * @returns Paginated countries response
   *
   * @example
   * ```typescript
   * const { countries, total } = await client.getCountries({ page: 1, pageSize: 20 });
   * console.log(`Loaded ${countries.length} of ${total} countries`);
   * ```
   */
  public async getCountries(options?: PaginationOptions): Promise<GetCountriesResponse> {
    return this.request<GetCountriesResponse>("POST", "/activations/getCountries", options || {});
  }

  /**
   * List available services with localized names and pagination.
   *
   * @param options - Filter options (country, language, page, pageSize)
   * @returns Paginated services response
   *
   * @example
   * ```typescript
   * const { services } = await client.getServices({ country: 0, language: 'eng' });
   * ```
   */
  public async getServices(options?: GetServicesOptions): Promise<GetServicesResponse> {
    return this.request<GetServicesResponse>("POST", "/activations/getServices", options || {});
  }

  /**
   * List prices and quantities for services by country.
   *
   * @param options - Filter options (country, service, page, pageSize)
   * @returns Paginated prices response
   *
   * @example
   * ```typescript
   * const prices = await client.getPrices({ country: 0, service: 'tg' });
   * ```
   */
  public async getPrices(options?: GetPricesOptions): Promise<GetPricesResponse> {
    return this.request<GetPricesResponse>("POST", "/activations/getPrices", options || {});
  }

  /**
   * Get number count and availability for a service.
   *
   * @param options - Service code and pagination
   * @returns Available numbers status
   *
   * @example
   * ```typescript
   * const status = await client.getNumbersStatus({ service: 'tg', page: 1 });
   * ```
   */
  public async getNumbersStatus(options: GetNumbersStatusOptions): Promise<GetNumbersStatusResponse> {
    return this.request<GetNumbersStatusResponse>("POST", "/activations/getNumbersStatus", options);
  }

  /**
   * Get top 10 countries with pricing for a given service.
   *
   * @param service - Service code (e.g. 'tg', 'wa')
   * @returns Top 10 country price list
   *
   * @example
   * ```typescript
   * const top10 = await client.getListOfTopCountriesByService('tg');
   * ```
   */
  public async getListOfTopCountriesByService(service: string): Promise<TopCountryPriceItem[]> {
    return this.request<TopCountryPriceItem[]>("POST", "/activations/getListOfTopCountriesByService", { service });
  }

  /**
   * Get top countries with counts and prices for a service with pagination.
   *
   * @param options - Service code and pagination
   * @returns Paginated top countries list
   *
   * @example
   * ```typescript
   * const top = await client.getTopCountriesByService({ service: 'tg', page: 1 });
   * ```
   */
  public async getTopCountriesByService(options: GetTopCountriesOptions): Promise<GetTopCountriesResponse> {
    return this.request<GetTopCountriesResponse>("POST", "/activations/getTopCountriesByService", options);
  }

  // ============================================================================
  // Activations: Purchasing & Lifecycle
  // ============================================================================

  /**
   * Order / purchase a virtual phone number for SMS or call verification.
   *
   * @param options - Service, country, verificationType, maxPrice, providerId
   * @returns Order details with activationId, phone, and price
   *
   * @example
   * ```typescript
   * const order = await client.getNumber({ service: 'tg', country: 2 });
   * console.log(`Phone: ${order.phone}, Activation ID: ${order.activationId}`);
   * ```
   */
  public async getNumber(options: GetNumberOptions): Promise<OrderedNumber> {
    return this.request<OrderedNumber>("POST", "/activations/getNumber", options);
  }

  /**
   * Check current status and received SMS code for an activation.
   *
   * @param activationId - Activation ID
   * @returns Status response (e.g. STATUS_WAIT_CODE, STATUS_OK:code, STATUS_CANCEL)
   *
   * @example
   * ```typescript
   * const status = await client.getStatus(order.activationId);
   * if (status.status.startsWith('STATUS_OK:')) {
   *   console.log(`Code: ${status.status.split(':')[1]}`);
   * }
   * ```
   */
  public async getStatus(activationId: number | string): Promise<ActivationStatusResponse> {
    return this.request<ActivationStatusResponse>("POST", "/activations/getStatus", { activationId });
  }

  /**
   * Check local / alternative status for an activation.
   *
   * @param activationId - Activation ID
   * @returns Status response
   *
   * @example
   * ```typescript
   * const status = await client.getStatusAlternative(order.activationId);
   * ```
   */
  public async getStatusAlternative(activationId: number | string): Promise<ActivationStatusResponse> {
    return this.request<ActivationStatusResponse>("POST", "/activations/getStatusAlternative", { activationId });
  }

  /**
   * Update activation status (Cancel, Finish, or NewCode).
   *
   * @param activationId - Activation ID
   * @param status - 'Cancel' | 'Finish' | 'NewCode'
   * @returns Updated status response
   *
   * @example
   * ```typescript
   * await client.setStatus(order.activationId, 'Finish');
   * ```
   */
  public async setStatus(
    activationId: number | string,
    status: ActivationAction | string
  ): Promise<ActivationStatusResponse> {
    return this.request<ActivationStatusResponse>("POST", "/activations/setStatus", { activationId, status });
  }

  /**
   * Cancel an activation order and release funds.
   *
   * @param activationId - Activation ID
   *
   * @example
   * ```typescript
   * await client.cancelActivation(order.activationId);
   * ```
   */
  public async cancelActivation(activationId: number | string): Promise<ActivationStatusResponse> {
    return this.setStatus(activationId, "Cancel");
  }

  /**
   * Finish and complete an activation after receiving the SMS code.
   *
   * @param activationId - Activation ID
   *
   * @example
   * ```typescript
   * await client.finishActivation(order.activationId);
   * ```
   */
  public async finishActivation(activationId: number | string): Promise<ActivationStatusResponse> {
    return this.setStatus(activationId, "Finish");
  }

  /**
   * Request an additional SMS code for an active activation.
   *
   * @param activationId - Activation ID
   *
   * @example
   * ```typescript
   * await client.requestNewCode(order.activationId);
   * ```
   */
  public async requestNewCode(activationId: number | string): Promise<ActivationStatusResponse> {
    return this.setStatus(activationId, "NewCode");
  }

  /**
   * Get user's activation history with pagination and active filter.
   *
   * @param options - Pagination and active filter options
   * @returns History of activations
   *
   * @example
   * ```typescript
   * const history = await client.getHistory({ active: true, page: 1 });
   * ```
   */
  public async getHistory(options?: GetHistoryOptions): Promise<GetHistoryResponse> {
    return this.request<GetHistoryResponse>("POST", "/activations/getHistory", options || {});
  }

  // ============================================================================
  // Rental (Long-Term Numbers)
  // ============================================================================

  /**
   * Query rental prices by service, country, and operator.
   *
   * @param options - Service code, optional country, and operator
   * @returns Rental pricing object
   *
   * @example
   * ```typescript
   * const rentPrices = await client.getRentPrices({ service: 'tg', country: 0 });
   * ```
   */
  public async getRentPrices(options: GetRentPricesOptions): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("POST", "/rent/getRentPrices", options);
  }

  /**
   * List current and historical rental orders.
   *
   * @param options - Pagination options
   * @returns Paginated rentals list
   *
   * @example
   * ```typescript
   * const rentals = await client.getRentList({ page: 1, pageSize: 10 });
   * ```
   */
  public async getRentList(options?: PaginationOptions): Promise<GetRentListResponse> {
    return this.request<GetRentListResponse>("POST", "/rent/getRentList", options || {});
  }

  /**
   * Get rental status and received SMS messages.
   *
   * @param options - Rent ID, page, pageSize
   * @returns Received SMS messages and status
   *
   * @example
   * ```typescript
   * const rentStatus = await client.getRentStatus({ rentId: 100, page: 1, pageSize: 10 });
   * ```
   */
  public async getRentStatus(options: GetRentStatusOptions): Promise<GetRentStatusResponse> {
    return this.request<GetRentStatusResponse>("POST", "/rent/getRentStatus", options);
  }

  /**
   * Get price quote for continuing / extending a rental.
   *
   * @param options - Rent ID and duration
   * @returns Price quote
   *
   * @example
   * ```typescript
   * const quote = await client.getContinueRentPriceNumber({ rentId: 100, time: 4 });
   * console.log(`Price to extend: ${quote.price}`);
   * ```
   */
  public async getContinueRentPriceNumber(options: {
    rentId: number | string;
    time?: number;
  }): Promise<{ price: number }> {
    return this.request<{ price: number }>("POST", "/rent/getContinueRentPriceNumber", options);
  }

  /**
   * Order a phone number for rental.
   *
   * @param options - Service, country, rental duration in hours, optional operator
   * @returns Ordered rental number details
   *
   * @example
   * ```typescript
   * const rental = await client.getRentNumber({ service: 'tg', country: 0, time: 4 });
   * console.log(`Rent ID: ${rental.rentId}, Phone: ${rental.phone}, End: ${rental.endDate}`);
   * ```
   */
  public async getRentNumber(options: GetRentNumberOptions): Promise<OrderedRentNumber> {
    return this.request<OrderedRentNumber>("POST", "/rent/getRentNumber", options);
  }

  /**
   * Change rental status (finish or cancel).
   *
   * @param options - Rent ID and status
   * @returns Status response
   *
   * @example
   * ```typescript
   * await client.setRentStatus({ rentId: 100, status: 2 });
   * ```
   */
  public async setRentStatus(options: {
    rentId: number | string;
    status: number | string;
  }): Promise<{ status: string }> {
    return this.request<{ status: string }>("POST", "/rent/setRentStatus", options);
  }

  /**
   * Extend an active rental duration.
   *
   * @param options - Rent ID and duration in hours
   * @returns Updated rental details
   *
   * @example
   * ```typescript
   * const continued = await client.continueRentNumber({ rentId: 100, time: 4 });
   * ```
   */
  public async continueRentNumber(options: {
    rentId: number | string;
    time?: number;
  }): Promise<ContinuedRentNumber> {
    return this.request<ContinuedRentNumber>("POST", "/rent/continueRentNumber", options);
  }

  /**
   * Idempotent rental extension (V2).
   *
   * @param options - Rent ID and duration in hours
   * @returns Updated rental details
   *
   * @example
   * ```typescript
   * const continued = await client.continueRentNumberV2({ rentId: 100, time: 4 });
   * ```
   */
  public async continueRentNumberV2(options: {
    rentId: number | string;
    time?: number;
  }): Promise<ContinuedRentNumber> {
    return this.request<ContinuedRentNumber>("POST", "/v2/rent/continueRentNumber", options);
  }

  // ============================================================================
  // Mail: Disposable Email Verification
  // ============================================================================

  /**
   * Get available mail domains for a target website.
   *
   * @param url - Target website domain (e.g. 'discord.com')
   * @returns Array of available domains with costs and quantities
   *
   * @example
   * ```typescript
   * const domains = await client.getMailDomains('discord.com');
   * ```
   */
  public async getMailDomains(url: string): Promise<MailDomainItem[]> {
    return this.request<MailDomainItem[]>("POST", "/mail/getDomains", { url });
  }

  /**
   * Get pricing for an email address on a specific domain and website.
   *
   * @param url - Target website
   * @param domain - Mail domain
   * @returns Price quote
   *
   * @example
   * ```typescript
   * const quote = await client.getMailPrice('discord.com', 'example.com');
   * console.log(`Price: ${quote.cost}`);
   * ```
   */
  public async getMailPrice(url: string, domain: string): Promise<MailPriceQuote> {
    return this.request<MailPriceQuote>("POST", "/mail/getPrice", { url, domain });
  }

  /**
   * Purchase a disposable email address for verification.
   *
   * @param url - Target website
   * @param domain - Mail domain
   * @returns Created email order
   *
   * @example
   * ```typescript
   * const mail = await client.buyMailDomain('discord.com', 'example.com');
   * console.log(`Email: ${mail.email}, ID: ${mail.id}`);
   * ```
   */
  public async buyMailDomain(url: string, domain: string): Promise<OrderedMailDomain> {
    return this.request<OrderedMailDomain>("POST", "/mail/buyDomain", { url, domain });
  }

  /**
   * Reorder / reactivate an existing email address.
   *
   * @param id - Mail order ID
   * @returns Reordered email details
   *
   * @example
   * ```typescript
   * const mail = await client.reorderMailDomain(123);
   * ```
   */
  public async reorderMailDomain(id: number | string): Promise<OrderedMailDomain> {
    return this.request<OrderedMailDomain>("POST", "/mail/reorderDomain", { id });
  }

  /**
   * Check status and received verification message for an email order.
   *
   * @param id - Mail order ID
   * @returns Mail status with message and code
   *
   * @example
   * ```typescript
   * const status = await client.getMailStatus(123);
   * if (status.value) {
   *   console.log(`Received code: ${status.value}`);
   * }
   * ```
   */
  public async getMailStatus(id: number | string): Promise<MailStatusResponse> {
    return this.request<MailStatusResponse>("POST", "/mail/getStatus", { id });
  }

  /**
   * Cancel an email order and refund balance.
   *
   * @param id - Mail order ID
   * @returns Cancellation result with balance
   *
   * @example
   * ```typescript
   * const result = await client.cancelMailOrder(123);
   * ```
   */
  public async cancelMailOrder(id: number | string): Promise<CancelMailOrderResponse> {
    return this.request<CancelMailOrderResponse>("POST", "/mail/cancelOrder", { id });
  }

  /**
   * List email orders with pagination.
   *
   * @param options - Pagination options
   * @returns Paginated email orders list
   *
   * @example
   * ```typescript
   * const orders = await client.getMailOrders({ page: 1, pageSize: 10 });
   * ```
   */
  public async getMailOrders(options?: PaginationOptions): Promise<GetMailOrdersResponse> {
    return this.request<GetMailOrdersResponse>("POST", "/mail/getOrders", options || {});
  }

  // ============================================================================
  // Legacy handler_api.php Compatibility
  // ============================================================================

  /**
   * Execute a raw call to the legacy SMS-Activate compatible handler_api.php endpoint.
   *
   * @param action - Action name (e.g. 'getBalance', 'getNumber', 'getStatus', 'setStatus')
   * @param params - Additional query parameters
   * @returns Raw string response from server
   *
   * @example
   * ```typescript
   * const raw = await client.handlerApi('getBalance');
   * console.log(raw); // "ACCESS_BALANCE:100.00"
   * ```
   */
  public async handlerApi(action: string, params: Record<string, unknown> = {}): Promise<string> {
    const response = await this.httpClient.get<string>("/stubs/handler_api.php", {
      params: {
        api_key: this.apiKey,
        action,
        ...params,
      },
      responseType: "text",
    });
    return response.data;
  }
}

/** Alias for GreedySMS */
export const GreedySMSClient = GreedySMS;
