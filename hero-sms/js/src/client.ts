import axios, { type AxiosInstance } from "axios";
import {
  ActivationStatusCode,
  type ActivationHistoryItem,
  type ActivationStatusV2,
  type ActiveActivationsResponse,
  type CountriesResponse,
  type GetAllSmsOptions,
  type GetAllSmsResponse,
  type GetActiveActivationsOptions,
  type GetHistoryOptions,
  type GetNumberOptions,
  type GetNumberV2Response,
  type GetPricesOptions,
  type GetRentNumberOptions,
  type GetRentPricesOptions,
  type GetRentServicesAndCountriesOptions,
  type GetRentServicesAndCountriesResponse,
  type GetServicesListOptions,
  type GetTopCountriesOptions,
  type HeroSMSOptions,
  type OperatorsResponse,
  type ParsedNumberResponse,
  type ParsedStatusResponse,
  type PricesByCountry,
  type ReactivationPriceResponse,
  type RentCountByService,
  type ServicesListResponse,
  type TopCountryInfo,
} from "./types.js";
import {
  AccountInactiveError,
  ActivationNotFoundError,
  ApiJsonError,
  AuthenticationError,
  BannedError,
  ChannelsLimitError,
  EarlyCancelError,
  ERROR_MESSAGES,
  HeroSMSError,
  isJsonErrorResponse,
  NoBalanceError,
  NoNumbersError,
  WrongMaxPriceError,
} from "./errors.js";

/** Default API base URL for HeroSMS */
export const DEFAULT_BASE_URL = "https://hero-sms.com/stubs/handler_api.php";

/** Partner attribution constant */
export const DEFAULT_REF = "tysik";

/**
 * HeroSMS API Client
 *
 * A TypeScript client for the HeroSMS activation and rental service.
 *
 * @example
 * ```typescript
 * import { HeroSMS } from 'hero-sms-client';
 *
 * const client = new HeroSMS({ apiKey: 'your-api-key' });
 * const balance = await client.getBalance();
 * console.log(`Balance: ${balance}`);
 * ```
 */
export class HeroSMS {
  private readonly apiKey: string;
  private readonly httpClient: AxiosInstance;

  /**
   * Initializes a new HeroSMS client.
   *
   * @param options - API key string or configuration options object
   *
   * @example
   * ```typescript
   * const client = new HeroSMS({ apiKey: 'your-api-key' });
   * ```
   */
  constructor(options: string | (HeroSMSOptions & { axios?: AxiosInstance })) {
    const config = typeof options === "string" ? { apiKey: options } : options;
    const apiKey = (config.apiKey || "").trim();

    if (!apiKey) {
      throw new HeroSMSError("NO_KEY", "API key is required");
    }

    this.apiKey = apiKey;
    this.httpClient =
      config.axios ??
      axios.create({
        baseURL: config.baseUrl || DEFAULT_BASE_URL,
        timeout: config.timeout || 30000,
      });
  }

  /**
   * Make a GET request to handler_api.php.
   */
  private async request<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await this.httpClient.get("", {
      params: {
        api_key: this.apiKey,
        action,
        ...params,
      },
    });

    const data = response.data;

    if (typeof data === "string") {
      this.checkForErrors(data);
    }

    if (isJsonErrorResponse(data)) {
      this.checkForJsonErrors(data);
    }

    return data as T;
  }

  /**
   * Check string response for known error codes.
   */
  private checkForErrors(response: string): void {
    if (response.startsWith("BANNED:")) {
      const bannedUntil = response.split(":")[1] || "unknown";
      throw new BannedError(response, bannedUntil);
    }

    if (response.startsWith("WRONG_MAX_PRICE:")) {
      const minPrice = parseFloat(response.split(":")[1] || "0");
      throw new WrongMaxPriceError(response, minPrice);
    }

    if (response === "NO_NUMBERS") throw new NoNumbersError(response);
    if (response === "BAD_KEY" || response === "NO_KEY") throw new AuthenticationError(response, response);
    if (response === "NO_ACTIVATION") throw new ActivationNotFoundError(response);
    if (response === "EARLY_CANCEL_DENIED") throw new EarlyCancelError(response);
    if (response === "CHANNELS_LIMIT") throw new ChannelsLimitError(response);
    if (response === "NO_BALANCE") throw new NoBalanceError(response);
    if (response === "ACCOUNT_INACTIVE") throw new AccountInactiveError(response);

    const errorCodes = [
      "BAD_ACTION",
      "ERROR_SQL",
      "BAD_SERVICE",
      "BAD_STATUS",
      "WRONG_ACTIVATION_ID",
      "OPERATORS_NOT_FOUND",
      "ORDER_ALREADY_EXISTS",
      "NO_ACTIVATIONS",
      "SERVICE_NOT_AVAILABLE",
      "SIM_OFFLINE",
      "UNPROCESSABLE_ENTITY",
      "FREE_CANCELLATION_EXPIRED",
      "OTP_RECEIVED",
      "NEW_OTP_RECEIVED",
      "ACTIVATION_NOT_ACTIVE",
      "FINISHED",
      "REFUNDED",
      "CANCELED",
      "BAD_DURATION",
      "WRONG_COUNTRY",
      "WRONG_SERVICE",
      "WRONG_CURRENCY",
      "NOT_FOUND",
      "SERVER_ERROR",
    ];

    for (const code of errorCodes) {
      if (response === code || response.startsWith(code + ":")) {
        throw new HeroSMSError(code, ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || code, response);
      }
    }
  }

  /**
   * Check structured JSON response for known error codes.
   */
  private checkForJsonErrors(data: { title: string; details: string; info?: Record<string, unknown> }): void {
    const { title, info } = data;
    const rawResponse = JSON.stringify(data);

    switch (title) {
      case "NO_NUMBERS":
        throw new NoNumbersError(rawResponse);
      case "BAD_KEY":
      case "NO_KEY":
        throw new AuthenticationError(title, rawResponse);
      case "NO_ACTIVATION":
        throw new ActivationNotFoundError(rawResponse);
      case "EARLY_CANCEL_DENIED":
        throw new EarlyCancelError(rawResponse);
      case "WRONG_MAX_PRICE":
        throw new WrongMaxPriceError(rawResponse, (info?.min as number) ?? 0);
      case "BANNED":
        throw new BannedError(rawResponse, (info?.readable_date as string) ?? "unknown");
      case "CHANNELS_LIMIT":
        throw new ChannelsLimitError(rawResponse, info as { current_threads?: number; max_allowed?: number });
      case "ACCOUNT_INACTIVE":
        throw new AccountInactiveError(rawResponse);
      case "NO_BALANCE":
        throw new NoBalanceError(rawResponse);
      default:
        throw new ApiJsonError(data, rawResponse);
    }
  }

  // ============================================================================
  // Account & Balance
  // ============================================================================

  /**
   * Get current account balance.
   *
   * @returns Current balance as a float number
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance}`);
   * ```
   */
  public async getBalance(): Promise<number> {
    const response = await this.request<string>("getBalance");
    const match = response.match(/ACCESS_BALANCE:(.+)/);
    if (!match) {
      throw new HeroSMSError("PARSE_ERROR", `Unexpected balance response: ${response}`, response);
    }
    return parseFloat(match[1]);
  }

  // ============================================================================
  // Number Management
  // ============================================================================

  /**
   * Request a phone number for activation.
   *
   * @param options - Options including service code and country
   * @returns Parsed response containing activationId and phoneNumber
   *
   * @example
   * ```typescript
   * const result = await client.getNumber({ service: 'tg', country: 2 });
   * console.log(`Phone: ${result.phoneNumber}, ID: ${result.activationId}`);
   * ```
   */
  public async getNumber(options: GetNumberOptions): Promise<ParsedNumberResponse> {
    const params: Record<string, unknown> = {
      service: options.service,
      country: options.country,
      ref: DEFAULT_REF,
    };

    if (options.maxPrice !== undefined) params.maxPrice = options.maxPrice;
    if (options.fixedPrice !== undefined) params.fixedPrice = options.fixedPrice;
    if (options.phoneException !== undefined) params.phoneException = options.phoneException;
    if (options.operator !== undefined) params.operator = options.operator;

    const response = await this.request<string>("getNumber", params);
    const match = response.match(/ACCESS_NUMBER:(\d+):(.+)/);
    if (!match) {
      throw new HeroSMSError("PARSE_ERROR", `Unexpected number response: ${response}`, response);
    }
    return {
      activationId: parseInt(match[1], 10),
      phoneNumber: match[2],
    };
  }

  /**
   * Request a phone number for activation (V2 - returns rich JSON metadata).
   *
   * @param options - Options including service code and country
   * @returns Detailed activation information
   *
   * @example
   * ```typescript
   * const activation = await client.getNumberV2({ service: 'tg', country: 2 });
   * console.log(`Activation ID: ${activation.activationId}`);
   * ```
   */
  public async getNumberV2(options: GetNumberOptions): Promise<GetNumberV2Response> {
    const params: Record<string, unknown> = {
      service: options.service,
      country: options.country,
      ref: DEFAULT_REF,
    };

    if (options.maxPrice !== undefined) params.maxPrice = options.maxPrice;
    if (options.fixedPrice !== undefined) params.fixedPrice = options.fixedPrice;
    if (options.phoneException !== undefined) params.phoneException = options.phoneException;
    if (options.operator !== undefined) params.operator = options.operator;

    return await this.request<GetNumberV2Response>("getNumberV2", params);
  }

  // ============================================================================
  // Activation Status Management
  // ============================================================================

  /**
   * Change activation status.
   *
   * @param id - Activation ID
   * @param status - Status code (1 = ready, 3 = resend, 6 = complete, 8 = cancel)
   * @returns Server response string (e.g. ACCESS_READY, ACCESS_ACTIVATION, ACCESS_CANCEL)
   *
   * @example
   * ```typescript
   * await client.setStatus(12345, ActivationStatusCode.SMS_SENT);
   * ```
   */
  public async setStatus(id: string | number, status: ActivationStatusCode | number): Promise<string> {
    return await this.request<string>("setStatus", { id, status });
  }

  /**
   * Mark activation as ready to receive SMS (status 1).
   *
   * @param id - Activation ID
   * @returns Server response string
   *
   * @example
   * ```typescript
   * await client.markReady(12345);
   * ```
   */
  public async markReady(id: string | number): Promise<string> {
    return this.setStatus(id, ActivationStatusCode.SMS_SENT);
  }

  /**
   * Request SMS resend (status 3).
   *
   * @param id - Activation ID
   * @returns Server response string
   *
   * @example
   * ```typescript
   * await client.requestResend(12345);
   * ```
   */
  public async requestResend(id: string | number): Promise<string> {
    return this.setStatus(id, ActivationStatusCode.REQUEST_RESEND);
  }

  /**
   * Complete activation and confirm receipt of SMS (status 6).
   *
   * @param id - Activation ID
   * @returns Server response string
   *
   * @example
   * ```typescript
   * await client.complete(12345);
   * ```
   */
  public async complete(id: string | number): Promise<string> {
    return this.setStatus(id, ActivationStatusCode.COMPLETE);
  }

  /**
   * Cancel activation and release balance (status 8).
   *
   * @param id - Activation ID
   * @returns Server response string
   *
   * @example
   * ```typescript
   * await client.cancel(12345);
   * ```
   */
  public async cancel(id: string | number): Promise<string> {
    return this.setStatus(id, ActivationStatusCode.CANCEL);
  }

  /**
   * Get current activation status.
   *
   * @param id - Activation ID
   * @returns Parsed status object with status string and optional code
   *
   * @example
   * ```typescript
   * const status = await client.getStatus(12345);
   * if (status.status === 'STATUS_OK') {
   *   console.log(`SMS code: ${status.code}`);
   * }
   * ```
   */
  public async getStatus(id: string | number): Promise<ParsedStatusResponse> {
    const response = await this.request<string>("getStatus", { id });

    if (response.startsWith("STATUS_OK:")) {
      return { status: "STATUS_OK", code: response.split(":")[1] };
    }
    if (response.startsWith("STATUS_WAIT_RETRY:")) {
      return { status: "STATUS_WAIT_RETRY", code: response.split(":")[1] };
    }
    if (response === "STATUS_WAIT_CODE") {
      return { status: "STATUS_WAIT_CODE" };
    }
    if (response === "STATUS_WAIT_RESEND") {
      return { status: "STATUS_WAIT_RESEND" };
    }
    if (response === "STATUS_CANCEL") {
      return { status: "STATUS_CANCEL" };
    }

    return { status: response as ParsedStatusResponse["status"] };
  }

  /**
   * Get detailed activation status (V2).
   *
   * @param id - Activation ID
   * @returns ActivationStatusV2 with SMS and call details
   *
   * @example
   * ```typescript
   * const status = await client.getStatusV2(12345);
   * console.log(`Verification type: ${status.verificationType}`);
   * ```
   */
  public async getStatusV2(id: string | number): Promise<ActivationStatusV2> {
    return await this.request<ActivationStatusV2>("getStatusV2", { id });
  }

  /**
   * Get active activations list.
   *
   * @param options - Pagination options
   * @returns Active activations response
   *
   * @example
   * ```typescript
   * const { data } = await client.getActiveActivations({ limit: 10 });
   * console.log(`Active count: ${data.length}`);
   * ```
   */
  public async getActiveActivations(options: GetActiveActivationsOptions = {}): Promise<ActiveActivationsResponse> {
    const params: Record<string, unknown> = {};
    if (options.start !== undefined) params.start = options.start;
    if (options.limit !== undefined) params.limit = options.limit;
    return await this.request<ActiveActivationsResponse>("getActiveActivations", params);
  }

  /**
   * Get activation history.
   *
   * @param options - History filter and pagination options
   * @returns Array of activation history items
   *
   * @example
   * ```typescript
   * const history = await client.getHistory({ size: 20 });
   * console.log(`History records: ${history.length}`);
   * ```
   */
  public async getHistory(options: GetHistoryOptions = {}): Promise<ActivationHistoryItem[]> {
    const params: Record<string, unknown> = {};
    if (options.start !== undefined) params.start = options.start;
    if (options.end !== undefined) params.end = options.end;
    if (options.offset !== undefined) params.offset = options.offset;
    if (options.size !== undefined) params.size = options.size;
    return await this.request<ActivationHistoryItem[]>("getHistory", params);
  }

  // ============================================================================
  // Reference Data & Catalogs
  // ============================================================================

  /**
   * Get list of available countries.
   *
   * @returns Map of country ID to country metadata
   *
   * @example
   * ```typescript
   * const countries = await client.getCountries();
   * console.log(countries['0']); // Russia
   * ```
   */
  public async getCountries(): Promise<CountriesResponse> {
    return await this.request<CountriesResponse>("getCountries");
  }

  /**
   * Get list of available services.
   *
   * @param options - Filter options (country, language)
   * @returns Services list response
   *
   * @example
   * ```typescript
   * const services = await client.getServicesList({ country: 0 });
   * console.log(services.services);
   * ```
   */
  public async getServicesList(options: GetServicesListOptions = {}): Promise<ServicesListResponse> {
    const params: Record<string, unknown> = {};
    if (options.country !== undefined) params.country = options.country;
    if (options.lang) params.lang = options.lang;
    return await this.request<ServicesListResponse>("getServicesList", params);
  }

  /**
   * Get list of available telecom operators.
   *
   * @param country - Optional country code
   * @returns Operators response
   *
   * @example
   * ```typescript
   * const ops = await client.getOperators(0);
   * console.log(ops.countryOperators);
   * ```
   */
  public async getOperators(country?: number): Promise<OperatorsResponse> {
    const params: Record<string, unknown> = {};
    if (country !== undefined) params.country = country;
    return await this.request<OperatorsResponse>("getOperators", params);
  }

  /**
   * Get service prices and availability.
   *
   * @param options - Filter by service and/or country
   * @returns Prices keyed by country and service
   *
   * @example
   * ```typescript
   * const prices = await client.getPrices({ country: 0, service: 'tg' });
   * ```
   */
  public async getPrices(options: GetPricesOptions = {}): Promise<PricesByCountry> {
    const params: Record<string, unknown> = {};
    if (options.country !== undefined) params.country = options.country;
    if (options.service !== undefined) params.service = options.service;
    return await this.request<PricesByCountry>("getPrices", params);
  }

  /**
   * Get top countries by service.
   *
   * @param options - Filter options
   * @returns List of top countries
   *
   * @example
   * ```typescript
   * const top = await client.getTopCountriesByService({ service: 'tg' });
   * ```
   */
  public async getTopCountriesByService(options: GetTopCountriesOptions = {}): Promise<TopCountryInfo[]> {
    const params: Record<string, unknown> = {};
    if (options.service) params.service = options.service;
    if (options.freePrice !== undefined) params.freePrice = options.freePrice;
    return await this.request<TopCountryInfo[]>("getTopCountriesByService", params);
  }

  /**
   * Get top countries by service based on user rank.
   *
   * @param options - Filter options
   * @returns List of top countries
   *
   * @example
   * ```typescript
   * const top = await client.getTopCountriesByServiceRank({ service: 'tg' });
   * ```
   */
  public async getTopCountriesByServiceRank(options: GetTopCountriesOptions = {}): Promise<TopCountryInfo[]> {
    const params: Record<string, unknown> = {};
    if (options.service) params.service = options.service;
    if (options.freePrice !== undefined) params.freePrice = options.freePrice;
    return await this.request<TopCountryInfo[]>("getTopCountriesByServiceRank", params);
  }

  // ============================================================================
  // Reactivation
  // ============================================================================

  /**
   * Reactivate a previously used phone number.
   *
   * @param id - Activation ID
   * @returns Activation details
   *
   * @example
   * ```typescript
   * const reactivated = await client.reactivate(12345);
   * ```
   */
  public async reactivate(id: string | number): Promise<GetNumberV2Response> {
    return await this.request<GetNumberV2Response>("reactivate", { id });
  }

  /**
   * Get reactivation price for a previously used number.
   *
   * @param id - Activation ID
   * @returns Reactivation price response
   *
   * @example
   * ```typescript
   * const quote = await client.getReactivationPrice(12345);
   * console.log(`Price: ${quote.data.price}`);
   * ```
   */
  public async getReactivationPrice(id: string | number): Promise<ReactivationPriceResponse> {
    return await this.request<ReactivationPriceResponse>("reactivationPrice", { id });
  }

  // ============================================================================
  // SMS Messages
  // ============================================================================

  /**
   * Get all SMS messages received for an activation.
   *
   * @param options - Activation ID and pagination
   * @returns All received SMS messages with metadata
   *
   * @example
   * ```typescript
   * const messages = await client.getAllSms({ id: 12345 });
   * console.log(`Received ${messages.data.length} messages`);
   * ```
   */
  public async getAllSms(options: GetAllSmsOptions): Promise<GetAllSmsResponse> {
    const params: Record<string, unknown> = { id: options.id };
    if (options.size !== undefined) params.size = options.size;
    if (options.page !== undefined) params.page = options.page;
    return await this.request<GetAllSmsResponse>("getAllSms", params);
  }

  /**
   * Finish activation (mark order work as complete).
   *
   * @param id - Activation ID
   *
   * @example
   * ```typescript
   * await client.finishActivation(12345);
   * ```
   */
  public async finishActivation(id: string | number): Promise<void> {
    await this.request("finishActivation", { id });
  }

  /**
   * Cancel activation purchase.
   *
   * @param id - Activation ID
   *
   * @example
   * ```typescript
   * await client.cancelActivation(12345);
   * ```
   */
  public async cancelActivation(id: string | number): Promise<void> {
    await this.request("cancelActivation", { id });
  }

  // ============================================================================
  // Rental
  // ============================================================================

  /**
   * Get rental prices and quantities by service.
   *
   * @param options - Service and optional filters
   * @returns Rental count and prices
   *
   * @example
   * ```typescript
   * const rentPrices = await client.getRentPrices({ service: 'tg', country: 0 });
   * ```
   */
  public async getRentPrices(options: GetRentPricesOptions): Promise<RentCountByService> {
    const params: Record<string, unknown> = { service: options.service };
    if (options.country !== undefined) params.country = options.country;
    if (options.operator !== undefined) params.operator = options.operator;
    if (options.currency !== undefined) params.currency = options.currency;
    return await this.request<RentCountByService>("serviceCountRent", params);
  }

  /**
   * Get available rental services and countries for a given duration.
   *
   * @param options - Country and duration
   * @returns Operators and services with pricing
   *
   * @example
   * ```typescript
   * const rentServices = await client.getRentServicesAndCountries({ country: 0, duration: 4 });
   * ```
   */
  public async getRentServicesAndCountries(
    options: GetRentServicesAndCountriesOptions
  ): Promise<GetRentServicesAndCountriesResponse> {
    return await this.request<GetRentServicesAndCountriesResponse>("getRentServicesAndCountries", {
      country: options.country,
      duration: options.duration,
    });
  }

  /**
   * Request a rental phone number.
   *
   * @param options - Rental options (service, country, duration, etc.)
   * @returns Activation details
   *
   * @example
   * ```typescript
   * const rental = await client.getRentNumber({ service: 'tg', country: 0, duration: 4 });
   * console.log(`Rental phone: ${rental.phoneNumber}`);
   * ```
   */
  public async getRentNumber(options: GetRentNumberOptions): Promise<GetNumberV2Response> {
    const params: Record<string, unknown> = {
      service: options.service,
      country: options.country,
      duration: options.duration,
      ref: DEFAULT_REF,
    };
    if (options.operator !== undefined) params.operator = options.operator;
    if (options.currency !== undefined) params.currency = options.currency;
    return await this.request<GetNumberV2Response>("getRentNumber", params);
  }
}

/** Alias for HeroSMS for backward compatibility */
export const HeroSMSClient = HeroSMS;
