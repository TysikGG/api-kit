import axios, { AxiosError, AxiosInstance } from "axios";
import { createNotLettersError, NotLettersError } from "./errors.js";
import {
  BuyEmailsParams,
  ChangePasswordParams,
  ChangePasswordResponse,
  EmailType,
  GetLettersParams,
  Letter,
  MailAccount,
  NotLettersClientOptions,
  UserData,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.notletters.com/v1";

/**
 * Parses a raw email string formatted as `"email:password"` into a {@link MailAccount}.
 *
 * @param raw - The raw credential string (e.g. `"test@notletters.com:12345678"`).
 * @returns Parsed {@link MailAccount} object.
 *
 * @example
 * ```typescript
 * import { parseMail } from "notletters";
 *
 * const account = parseMail("user@notletters.com:pass123");
 * console.log(account.email); // "user@notletters.com"
 * console.log(account.password); // "pass123"
 * ```
 */
export function parseMail(raw: string): MailAccount {
  const colonIndex = raw.indexOf(":");
  if (colonIndex === -1) {
    return { email: raw.trim(), password: "", raw };
  }
  return {
    email: raw.slice(0, colonIndex).trim(),
    password: raw.slice(colonIndex + 1),
    raw,
  };
}

/**
 * Client for interacting with the NotLetters email service API.
 */
export class NotLetters {
  private readonly apiToken?: string;
  private readonly http: AxiosInstance;

  /**
   * Creates an instance of the NotLetters client.
   *
   * @param options - Configuration options for the client.
   *
   * @example
   * ```typescript
   * import { NotLetters } from "notletters";
   *
   * const client = new NotLetters({ apiToken: "your-api-token" });
   * const me = await client.getMe();
   * console.log(`Logged in as ${me.username}, balance: ${me.balance}`);
   * ```
   */
  constructor(options: NotLettersClientOptions = {}) {
    this.apiToken = options.apiToken || process.env.NOTLETTERS_API_TOKEN;
    const baseURL = (options.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 30000;
    const userAgent = options.userAgent || "notletters/0.1.0";

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
    }

    this.http = axios.create({
      baseURL,
      timeout,
      headers,
    });
  }

  /**
   * Sends an HTTP request and unpacks or verifies the response.
   */
  private async request<T>(
    method: "GET" | "POST",
    path: string,
    data?: unknown
  ): Promise<T> {
    try {
      const response = await this.http.request<T>({
        method,
        url: path,
        data,
      });

      const body = response.data;
      if (body && typeof body === "object" && "code" in body) {
        const codeNum = Number((body as { code: unknown }).code);
        if (!isNaN(codeNum) && codeNum >= 400) {
          throw createNotLettersError(codeNum, body);
        }
      }

      return body;
    } catch (err: unknown) {
      if (err instanceof NotLettersError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<unknown>;
        const status = axiosErr.response?.status;
        const resData = axiosErr.response?.data;
        throw createNotLettersError(status, resData, axiosErr.message);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new NotLettersError(message);
    }
  }

  /**
   * Retrieves profile information and current balance for the authenticated user.
   *
   * @returns User profile and balance details.
   *
   * @example
   * ```typescript
   * import { NotLetters } from "notletters";
   *
   * const client = new NotLetters({ apiToken: "your-api-token" });
   * const profile = await client.getMe();
   * console.log(`User: ${profile.username}, Balance: ${profile.balance}`);
   * ```
   */
  async getMe(): Promise<UserData> {
    const res = await this.request<{ data: UserData }>("GET", "/me");
    if (!res || !res.data) {
      throw new NotLettersError("Invalid response format: missing data property", {
        responseBody: res,
      });
    }
    return res.data;
  }

  /**
   * Convenience method to retrieve the current account balance.
   *
   * @returns Current balance in rubles / account currency.
   *
   * @example
   * ```typescript
   * import { NotLetters } from "notletters";
   *
   * const client = new NotLetters({ apiToken: "your-api-token" });
   * const balance = await client.getBalance();
   * console.log(`Balance: ${balance}`);
   * ```
   */
  async getBalance(): Promise<number> {
    const me = await this.getMe();
    return me.balance;
  }

  /**
   * Retrieves email messages from a specific mailbox, with optional filters.
   *
   * @param params - Email credentials and optional search / star filters.
   * @returns Array of retrieved email messages.
   *
   * @example
   * ```typescript
   * import { NotLetters } from "notletters";
   *
   * const client = new NotLetters({ apiToken: "your-api-token" });
   * const letters = await client.getLetters({
   *   email: "user@notletters.com",
   *   password: "mailbox-password",
   *   filters: { search: "Verification code", star: false },
   * });
   * for (const letter of letters) {
   *   console.log(`From: ${letter.sender}, Subject: ${letter.subject}`);
   *   console.log(letter.letter.text);
   * }
   * ```
   */
  async getLetters(params: GetLettersParams): Promise<Letter[]> {
    if (!params.email) {
      throw new NotLettersError("email is required");
    }
    if (!params.password) {
      throw new NotLettersError("password is required");
    }

    const payload: Record<string, unknown> = {
      email: params.email,
      password: params.password,
    };

    if (params.filters) {
      const filters: Record<string, unknown> = {};
      if (params.filters.search !== undefined) {
        filters.search = params.filters.search;
      }
      if (params.filters.star !== undefined) {
        filters.star = params.filters.star;
      }
      payload.filters = filters;
    }

    const res = await this.request<{ data: { letters: Letter[] } }>(
      "POST",
      "/letters",
      payload
    );

    if (!res || !res.data || !Array.isArray(res.data.letters)) {
      throw new NotLettersError("Invalid response format: missing letters list", {
        responseBody: res,
      });
    }

    return res.data.letters;
  }

  /**
   * Changes the password of an existing mailbox.
   *
   * @param params - Mailbox email, old password, and new password.
   * @returns Status code and confirmation message.
   *
   * @example
   * ```typescript
   * import { NotLetters } from "notletters";
   *
   * const client = new NotLetters({ apiToken: "your-api-token" });
   * const result = await client.changePassword({
   *   email: "user@notletters.com",
   *   oldPassword: "old-password",
   *   newPassword: "new-password",
   * });
   * console.log(result.data); // "password successful changed"
   * ```
   */
  async changePassword(params: ChangePasswordParams): Promise<ChangePasswordResponse> {
    const oldPassword = params.oldPassword ?? params.old_password;
    const newPassword = params.newPassword ?? params.new_password;

    if (!params.email) {
      throw new NotLettersError("email is required");
    }
    if (!oldPassword) {
      throw new NotLettersError("old_password is required");
    }
    if (!newPassword) {
      throw new NotLettersError("new_password is required");
    }

    const payload = {
      email: params.email,
      old_password: oldPassword,
      new_password: newPassword,
    };

    const res = await this.request<ChangePasswordResponse>(
      "POST",
      "/change-password",
      payload
    );

    return res;
  }

  /**
   * Purchases email mailboxes. Note: this method charges the account balance.
   *
   * @param params - Number of emails to purchase and email type.
   * @returns Array of purchased mailboxes with parsed credentials.
   *
   * @example
   * ```typescript
   * import { NotLetters, EmailType } from "notletters";
   *
   * const client = new NotLetters({ apiToken: "your-api-token" });
   * const accounts = await client.buyEmails({
   *   count: 1,
   *   typeEmail: EmailType.LIMIT,
   * });
   * for (const account of accounts) {
   *   console.log(`Bought: ${account.email} with password: ${account.password}`);
   * }
   * ```
   */
  async buyEmails(params: BuyEmailsParams): Promise<MailAccount[]> {
    const count = params.count;
    const typeEmail = params.typeEmail ?? params.type_email ?? EmailType.LIMIT;

    if (typeof count !== "number" || count < 1) {
      throw new NotLettersError("count must be an integer greater than or equal to 1");
    }

    const payload = {
      count,
      type_email: typeEmail,
    };

    const res = await this.request<{ code: number; data: string[] }>(
      "POST",
      "/buy-emails",
      payload
    );

    if (!res || !Array.isArray(res.data)) {
      throw new NotLettersError("Invalid response format: missing data array", {
        responseBody: res,
      });
    }

    return res.data.map(parseMail);
  }
}
