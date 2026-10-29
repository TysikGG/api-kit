import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import axios, { AxiosError, AxiosInstance, AxiosProxyConfig, AxiosRequestConfig } from "axios";
import { resultShape, resolveFreeModel, type FreeModelId } from "./codes.js";
import {
  ChaojiyingError,
  ImageTooLargeError,
  InvalidImageError,
  MalformedBase64Error,
  MissingCredentialsError,
  NetworkError,
  RateLimitError,
  ResponseIntegrityError,
  TimeoutError,
  createApiError,
} from "./errors.js";
import {
  MAX_FREE_IMAGE_BYTES,
  MAX_PAID_IMAGE_BYTES,
  parsePlates,
  parsePoints,
  parseRectangles,
  parseTextLocations,
  verifyResponseMd5,
} from "./parse.js";
import type {
  ChaojiyingOptions,
  FreeRecognizeOptions,
  ProxyOptions,
  RecognizeOptions,
  RecognizeResult,
  ReportErrorResult,
  ScoreResult,
} from "./types.js";

/** Partner software id. Sent as `softid` on recognize and report. */
export const SOFT_ID = "984642";
/** Partner software key. Used to verify the response `md5`. */
export const SOFT_KEY = "369fe52d5cdbb147892a40ac78f13e60";

const SCORE_PATH = "/Upload/GetScore.php";
const PROCESSING_PATH = "/Upload/Processing.php";
const REPORT_PATH = "/Upload/ReportError.php";

export type ImageInput = Buffer | Uint8Array | ArrayBuffer | string;

type RetryPolicy = "safe" | "paid";

interface PreparedImage {
  bytes: Buffer;
  base64: string;
}

/**
 * Client for the Chaojiying (超级鹰) CAPTCHA recognition API.
 *
 * Paid calls go to `upload.chaojiying.net`. Free OCR v2 goes to `api.chaojiying.com`.
 * Recognition is a single HTTP request that blocks until the answer is ready.
 * There is no separate poll endpoint.
 */
export class Chaojiying {
  private readonly username?: string;
  private readonly passwordHash?: string;
  private readonly accessToken?: string;
  private readonly apiKey?: string;
  private readonly softId: string;
  private readonly softKey: string;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly freeBaseURL: string;
  private readonly http: AxiosInstance;

  /**
   * @example
   * ```typescript
   * import { Chaojiying } from "chaojiying-client";
   *
   * const client = new Chaojiying({
   *   username: "your_username",
   *   password: "your_password",
   * });
   * const score = await client.getScore();
   * console.log(score.tifen);
   * ```
   */
  constructor(options: ChaojiyingOptions = {}) {
    const user = options.username || process.env.CHAOJIYING_USER;
    const pass = options.password || process.env.CHAOJIYING_PASS;
    const accessToken = options.accessToken || process.env.CHAOJIYING_ACCESS_TOKEN;
    const apiKey = options.apiKey || process.env.CHAOJIYING_API_KEY;

    const alternateAuth = Boolean(accessToken || apiKey);
    if (!alternateAuth && !user) {
      throw new MissingCredentialsError("Chaojiying username is required.");
    }
    if (!alternateAuth && !pass) {
      throw new MissingCredentialsError("Chaojiying password is required.");
    }

    this.username = user || undefined;
    this.passwordHash = pass ? hashPassword(pass) : undefined;
    this.accessToken = accessToken || undefined;
    this.apiKey = apiKey || undefined;
    this.softId = options.softId || SOFT_ID;
    this.softKey = options.softKey || (this.softId === SOFT_ID ? SOFT_KEY : "");
    this.retries = Math.max(0, options.retries ?? 2);
    this.retryDelayMs = options.retryDelayMs ?? 200;
    this.freeBaseURL = (options.freeBaseURL || "https://api.chaojiying.com").replace(/\/+$/, "");

    const baseURL = (options.baseURL || "https://upload.chaojiying.net").replace(/\/+$/, "");
    const timeout = options.timeoutMs ?? 60000;
    const userAgent = options.userAgent || "chaojiying-client/0.1.0";
    const proxy = options.proxy ? toAxiosProxy(options.proxy) : undefined;

    this.http = axios.create({
      baseURL,
      timeout,
      proxy,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });
  }

  /**
   * Remaining points (`tifen`) and locked points (`tifen_lock`).
   * This call does not spend points.
   */
  async getScore(): Promise<ScoreResult> {
    const data = await this.post({
      path: SCORE_PATH,
      form: this.authFields(),
      policy: "safe",
    });
    return {
      err_no: asNumber(data.err_no),
      err_str: asString(data.err_str),
      tifen: asNumber(data.tifen),
      tifen_lock: data.tifen_lock === undefined ? 0 : asNumber(data.tifen_lock),
    };
  }

  /** Alias of {@link getScore}. */
  getBalance(): Promise<ScoreResult> {
    return this.getScore();
  }

  /**
   * Recognize one image. A successful response (`err_no == 0`) is already billed.
   *
   * @param image - Raw bytes, a base64 string, or a `data:image/...;base64,` URI.
   * @param codeType - Price-table id, for example `1004` or `CodeType.ALNUM_1_TO_4`.
   */
  async recognize(
    image: ImageInput,
    codeType: number | string,
    options?: RecognizeOptions
  ): Promise<RecognizeResult> {
    if (codeType === "" || (typeof codeType === "number" && !Number.isFinite(codeType))) {
      throw new ChaojiyingError("codetype is required.");
    }
    const prepared = prepareImage(image, MAX_PAID_IMAGE_BYTES);
    const fields = this.recognizeFields(codeType, options, prepared.base64, options?.upload !== "multipart");
    const data = await this.post({
      path: PROCESSING_PATH,
      form: options?.upload === "multipart" || options?.bodyFormat === "json" ? undefined : fields,
      json: options?.upload !== "multipart" && options?.bodyFormat === "json" ? fields : undefined,
      multipart:
        options?.upload === "multipart"
          ? {
              fields: this.recognizeFields(codeType, options, undefined, false),
              filename: options.filename || "captcha.jpg",
              bytes: prepared.bytes,
            }
          : undefined,
      policy: "paid",
    });
    return this.finishRecognize(data, codeType, options?.verifyMd5 === true);
  }

  /** Official sample name for a multipart `userfile` upload. */
  postPic(
    image: ImageInput,
    codeType: number | string,
    options?: RecognizeOptions
  ): Promise<RecognizeResult> {
    return this.recognize(image, codeType, { ...options, upload: "multipart" });
  }

  /** Official sample name for a `file_base64` upload. */
  postPicBase64(
    image: ImageInput,
    codeType: number | string,
    options?: RecognizeOptions
  ): Promise<RecognizeResult> {
    return this.recognize(image, codeType, { ...options, upload: "base64" });
  }

  /** Read a file from disk and recognize it. */
  async recognizeFile(
    filePath: string,
    codeType: number | string,
    options?: RecognizeOptions
  ): Promise<RecognizeResult> {
    const bytes = await readFile(filePath);
    return this.recognize(bytes, codeType, options);
  }

  /**
   * Report a wrong answer and ask for the points back.
   * Only valid for about three minutes after `pic_id` was issued, and only when
   * the caller knows the answer is wrong. Some codetypes return -10133.
   */
  async reportError(picId: string): Promise<ReportErrorResult> {
    if (!picId) {
      throw new ChaojiyingError("pic_id is required.");
    }
    const data = await this.post({
      path: REPORT_PATH,
      form: { ...this.authFields(), softid: this.softId, id: picId },
      policy: "paid",
    });
    return { err_no: asNumber(data.err_no), err_str: asString(data.err_str) };
  }

  /** Alias of {@link reportError}. */
  report(picId: string): Promise<ReportErrorResult> {
    return this.reportError(picId);
  }

  /**
   * Free OCR v2 (`https://api.chaojiying.com/ocr/v2/{6|8|9}?ak=`).
   * Model `6` / `calc` returns a calculation, `8` / `text` returns characters,
   * `9` / `blocks` returns rectangles. Requires an API key.
   */
  async recognizeFree(
    image: ImageInput,
    model: number | string,
    options?: FreeRecognizeOptions
  ): Promise<RecognizeResult> {
    let resolved: FreeModelId;
    try {
      resolved = resolveFreeModel(model);
    } catch (err) {
      throw new ChaojiyingError(err instanceof Error ? err.message : String(err));
    }
    const apiKey = options?.apiKey || this.apiKey;
    if (!apiKey) {
      throw new MissingCredentialsError(
        "Free OCR requires an API key (apiKey or CHAOJIYING_API_KEY)."
      );
    }
    const prepared = prepareImage(image, MAX_FREE_IMAGE_BYTES);
    const upload = options?.upload ?? "base64";
    const data = await this.post({
      path: `/ocr/v2/${resolved}`,
      baseURL: this.freeBaseURL,
      query: { ak: apiKey },
      form: upload === "base64" ? { file_base64: prepared.base64 } : undefined,
      multipart:
        upload === "multipart"
          ? { fields: {}, filename: options?.filename || "captcha.jpg", bytes: prepared.bytes }
          : undefined,
      policy: "safe",
    });
    const shape = resolved === 9 ? "rectangles" : "text";
    return shapeResult(data, shape);
  }

  private authFields(): Record<string, string> {
    const fields: Record<string, string> = {};
    if (this.accessToken) fields.access_token = this.accessToken;
    if (this.username && this.passwordHash) {
      fields.user = this.username;
      fields.pass2 = this.passwordHash;
    }
    return fields;
  }

  private recognizeFields(
    codeType: number | string,
    options: RecognizeOptions | undefined,
    base64: string | undefined,
    includeBase64: boolean
  ): Record<string, string> {
    const fields: Record<string, string> = {
      ...this.authFields(),
      softid: this.softId,
      codetype: String(codeType),
    };
    if (options?.strDebug) fields.str_debug = options.strDebug;
    if (options?.lenMin !== undefined) fields.len_min = String(options.lenMin);
    if (options?.timeAdd !== undefined) fields.time_add = String(options.timeAdd);
    if (includeBase64 && base64 !== undefined) fields.file_base64 = base64;
    return fields;
  }

  private finishRecognize(
    data: Record<string, unknown>,
    codeType: number | string,
    verifyMd5: boolean
  ): RecognizeResult {
    const result = shapeResult(data, resultShape(codeType));
    if (!verifyMd5) return result;
    if (!this.softKey) {
      throw new ResponseIntegrityError(
        "softKey is required to verify md5 when softId is not the built-in partner id."
      );
    }
    if (!result.md5) {
      throw new ResponseIntegrityError("Response did not include an md5 checksum.", {
        responseBody: data,
      });
    }
    if (!verifyResponseMd5(result, this.softId, this.softKey)) {
      throw new ResponseIntegrityError("Response md5 did not match softid, softkey, pic_id, and pic_str.", {
        responseBody: data,
      });
    }
    return result;
  }

  private async post(spec: {
    path: string;
    baseURL?: string;
    query?: Record<string, string>;
    form?: Record<string, string>;
    json?: Record<string, string>;
    multipart?: { fields: Record<string, string>; filename: string; bytes: Buffer };
    policy: RetryPolicy;
  }): Promise<Record<string, unknown>> {
    const attempts = this.retries + 1;
    let attempt = 0;
    for (;;) {
      try {
        return await this.sendOnce(spec);
      } catch (err) {
        attempt += 1;
        if (attempt >= attempts || !canRetry(err, spec.policy)) throw err;
        await delay(this.retryDelayMs * attempt);
      }
    }
  }

  private async sendOnce(spec: {
    path: string;
    baseURL?: string;
    query?: Record<string, string>;
    form?: Record<string, string>;
    json?: Record<string, string>;
    multipart?: { fields: Record<string, string>; filename: string; bytes: Buffer };
  }): Promise<Record<string, unknown>> {
    const config: AxiosRequestConfig = {
      params: spec.query,
      baseURL: spec.baseURL,
      validateStatus: () => true,
    };
    let body: unknown;
    if (spec.multipart) {
      const form = new FormData();
      for (const [key, value] of Object.entries(spec.multipart.fields)) {
        form.append(key, value);
      }
      form.append("userfile", new Blob([spec.multipart.bytes]), spec.multipart.filename);
      body = form;
      config.headers = { "Content-Type": undefined };
    } else if (spec.json) {
      body = spec.json;
      config.headers = { "Content-Type": "application/json" };
    } else {
      body = new URLSearchParams(spec.form ?? {}).toString();
      config.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    }

    try {
      const response = await this.http.post(spec.path, body, config);
      return interpretHttp(response.status, response.data);
    } catch (err: unknown) {
      if (err instanceof ChaojiyingError) throw err;
      if (axios.isAxiosError(err)) throw wrapAxios(err);
      throw new ChaojiyingError(err instanceof Error ? err.message : String(err));
    }
  }
}

function hashPassword(password: string): string {
  if (/^[0-9a-f]{32}$/i.test(password)) return password.toLowerCase();
  return createHash("md5").update(password, "utf8").digest("hex");
}

function prepareImage(image: ImageInput, maxBytes: number): PreparedImage {
  if (typeof image === "string") {
    const stripped = image.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "").replace(/\s+/g, "");
    if (!stripped) {
      throw new InvalidImageError("Image data is empty.", { errNo: -10061, errStr: "不是有效的图片文件" });
    }
    const normalized = stripped.replace(/-/g, "+").replace(/_/g, "/");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
      throw new MalformedBase64Error("file_base64 is not valid base64.", {
        errNo: -100612,
        errStr: "base64字符解析异常",
      });
    }
    const bytes = Buffer.from(normalized, "base64");
    assertImageSize(bytes, maxBytes);
    return { bytes, base64: bytes.toString("base64") };
  }
  const bytes = toBuffer(image);
  assertImageSize(bytes, maxBytes);
  return { bytes, base64: bytes.toString("base64") };
}

function toBuffer(image: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(image)) return image;
  if (image instanceof ArrayBuffer) return Buffer.from(image);
  return Buffer.from(image);
}

function assertImageSize(bytes: Buffer, maxBytes: number): void {
  if (bytes.length === 0) {
    throw new InvalidImageError("Image data is empty.", { errNo: -10061, errStr: "不是有效的图片文件" });
  }
  if (bytes.length > maxBytes) {
    const limit = maxBytes === MAX_FREE_IMAGE_BYTES ? "2MB" : "1024KB";
    throw new ImageTooLargeError(`Image is ${bytes.length} bytes; the limit is ${limit}.`, {
      errNo: -10062,
      errStr: "文件超大 1024k",
    });
  }
}

function interpretHttp(status: number, data: unknown): Record<string, unknown> {
  const record = asRecord(data);
  if (record && record.err_no !== undefined && record.err_no !== null) {
    const errNo = asNumber(record.err_no);
    if (errNo !== 0) {
      throw createApiError(errNo, typeof record.err_str === "string" ? record.err_str : undefined, record);
    }
    return record;
  }
  if (status === 429) {
    throw new RateLimitError("Chaojiying error -429: 请求过于频繁", {
      errNo: -429,
      errStr: "请求过于频繁",
      responseBody: data,
    });
  }
  if (status >= 500 || status === 408) {
    throw new NetworkError(`HTTP ${status}`, { status, connectFailure: false, responseBody: data });
  }
  if (status >= 400) {
    throw new NetworkError(`HTTP ${status}`, { status, connectFailure: false, responseBody: data });
  }
  if (!record) {
    throw new ChaojiyingError("Chaojiying returned a non-JSON response.", { responseBody: data });
  }
  throw new ChaojiyingError("Chaojiying response did not include err_no.", { responseBody: record });
}

function shapeResult(data: Record<string, unknown>, shape: ReturnType<typeof resultShape>): RecognizeResult {
  const result: RecognizeResult = {
    err_no: asNumber(data.err_no),
    err_str: asString(data.err_str),
    pic_id: data.pic_id === undefined || data.pic_id === null ? "" : String(data.pic_id),
    pic_str: data.pic_str === undefined || data.pic_str === null ? "" : String(data.pic_str),
  };
  if (typeof data.md5 === "string" && data.md5) result.md5 = data.md5;
  if (!result.pic_str) return result;
  try {
    if (shape === "points") result.points = parsePoints(result.pic_str);
    else if (shape === "rectangles") result.rectangles = parseRectangles(result.pic_str);
    else if (shape === "text-locations") result.text_locations = parseTextLocations(result.pic_str);
    else if (shape === "plates") result.plates = parsePlates(result.pic_str);
  } catch {
    // Keep the raw pic_str when a coordinate payload is not in the expected shape.
  }
  return result;
}

function wrapAxios(err: AxiosError): ChaojiyingError {
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return new TimeoutError(err.message || "Request timed out");
  }
  const status = err.response?.status;
  return new NetworkError(err.message || "Network request failed", {
    status,
    connectFailure: !err.response,
    responseBody: err.response?.data,
  });
}

function canRetry(err: unknown, policy: RetryPolicy): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof TimeoutError) return policy === "safe";
  if (err instanceof NetworkError) return policy === "safe" || err.connectFailure;
  return false;
}

function asRecord(data: unknown): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return data as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  throw new ChaojiyingError(`Expected a number but received ${JSON.stringify(value)}.`);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return String(value);
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAxiosProxy(proxy: string | ProxyOptions): AxiosProxyConfig {
  if (typeof proxy === "string") {
    let url: URL;
    try {
      url = new URL(proxy);
    } catch {
      throw new ChaojiyingError(`Invalid proxy URL "${proxy}".`);
    }
    const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
    const config: AxiosProxyConfig = {
      protocol: url.protocol.replace(":", ""),
      host: url.hostname,
      port,
    };
    if (url.username) {
      config.auth = {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      };
    }
    return config;
  }
  return {
    protocol: proxy.protocol,
    host: proxy.host,
    port: proxy.port,
    auth: proxy.auth,
  };
}
