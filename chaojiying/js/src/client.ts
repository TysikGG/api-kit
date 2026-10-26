import { createHash } from "node:crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import { ChaojiyingError } from "./errors.js";
import type {
  ChaojiyingOptions,
  RecognizeOptions,
  RecognizeResult,
  ReportErrorResult,
  ScoreResult,
} from "./types.js";

/** @internal */
export const SOFT_ID = "984642";
/** @internal */
export const SOFT_KEY = "369fe52d5cdbb147892a40ac78f13e60";

/**
 * Client for interacting with the Chaojiying (超级鹰) CAPTCHA recognition API.
 */
export class Chaojiying {
  private readonly username: string;
  private readonly passwordHash: string;
  private readonly http: AxiosInstance;

  /**
   * Creates an instance of the Chaojiying client.
   *
   * @example
   * ```typescript
   * import { Chaojiying } from "chaojiying-client";
   *
   * const client = new Chaojiying({
   *   username: "your_username",
   *   password: "your_password",
   * });
   * const score = await client.getScore();
   * console.log(`Remaining points: ${score.tifen}`);
   * ```
   */
  constructor(options: ChaojiyingOptions = {}) {
    const user = options.username || process.env.CHAOJIYING_USER;
    const pass = options.password || process.env.CHAOJIYING_PASS;

    if (!user) {
      throw new ChaojiyingError("Chaojiying username is required.");
    }
    if (!pass) {
      throw new ChaojiyingError("Chaojiying password is required.");
    }

    this.username = user;
    this.passwordHash = this.hashPassword(pass);

    const baseURL = (options.baseURL || "https://upload.chaojiying.net").replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 60000;
    const userAgent = options.userAgent || "chaojiying-client/0.1.0";

    this.http = axios.create({
      baseURL,
      timeout,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  private hashPassword(password: string): string {
    if (/^[0-9a-f]{32}$/i.test(password)) {
      return password.toLowerCase();
    }
    return createHash("md5").update(password, "utf8").digest("hex");
  }

  private async postForm<T extends { err_no: number; err_str: string }>(
    path: string,
    params: Record<string, string>
  ): Promise<T> {
    try {
      const body = new URLSearchParams(params).toString();
      const response = await this.http.post<T>(path, body);
      const data = response.data;

      if (data && typeof data === "object" && typeof data.err_no === "number") {
        if (data.err_no !== 0) {
          throw new ChaojiyingError(
            `Chaojiying error ${data.err_no}: ${data.err_str || "Unknown error"}`,
            {
              errNo: data.err_no,
              errStr: data.err_str,
              responseBody: data,
            }
          );
        }
        return data;
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof ChaojiyingError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ err_no?: number; err_str?: string }>;
        const data = axiosErr.response?.data;
        const errNo = data && typeof data === "object" ? data.err_no : undefined;
        const errStr = data && typeof data === "object" ? data.err_str : undefined;
        throw new ChaojiyingError(errStr || axiosErr.message || "Network request failed", {
          errNo,
          errStr,
          responseBody: data,
        });
      }
      throw new ChaojiyingError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Retrieves the remaining points / score balance for the user account.
   *
   * @example
   * ```typescript
   * const score = await client.getScore();
   * console.log(`Available points: ${score.tifen}`);
   * ```
   */
  async getScore(): Promise<ScoreResult> {
    return this.postForm<ScoreResult>("/Upload/GetScore.php", {
      user: this.username,
      pass2: this.passwordHash,
    });
  }

  /**
   * Recognizes a CAPTCHA image and returns the parsed solution.
   *
   * @param image - Image binary (Buffer/Uint8Array) or Base64 string.
   * @param codeType - CAPTCHA type ID (e.g. 1004 for 4-letter alphanumeric, 1902 for general).
   * @param options - Additional parameters such as debug instructions.
   *
   * @example
   * ```typescript
   * import * as fs from "node:fs";
   *
   * const img = fs.readFileSync("captcha.jpg");
   * const result = await client.recognize(img, 1004);
   * console.log(`Recognized code: ${result.pic_str}`);
   * ```
   */
  async recognize(
    image: Buffer | Uint8Array | string,
    codeType: number | string,
    options?: RecognizeOptions
  ): Promise<RecognizeResult> {
    let base64: string;

    if (typeof image === "string") {
      base64 = image.replace(/^data:image\/[a-z]+;base64,/, "");
    } else {
      base64 = Buffer.from(image).toString("base64");
    }

    const params: Record<string, string> = {
      user: this.username,
      pass2: this.passwordHash,
      softid: SOFT_ID,
      codetype: String(codeType),
      file_base64: base64,
    };

    if (options?.strDebug) {
      params.str_debug = options.strDebug;
    }

    return this.postForm<RecognizeResult>("/Upload/Processing.php", params);
  }

  /**
   * Reports an incorrectly solved CAPTCHA to request a point refund.
   * Must be called within 3 minutes of receiving the picture ID.
   *
   * @param picId - Picture ID returned by recognize (pic_id).
   *
   * @example
   * ```typescript
   * await client.reportError(result.pic_id);
   * console.log("Reported mistake successfully");
   * ```
   */
  async reportError(picId: string): Promise<ReportErrorResult> {
    return this.postForm<ReportErrorResult>("/Upload/ReportError.php", {
      user: this.username,
      pass2: this.passwordHash,
      softid: SOFT_ID,
      id: picId,
    });
  }
}
