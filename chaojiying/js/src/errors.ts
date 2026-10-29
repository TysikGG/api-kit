/**
 * Errors returned by Chaojiying, one class per documented `err_no`.
 * Messages and remedies follow https://www.chaojiying.com/api-23.html
 * plus the type-guide codes -10042, -10043, and -3002.
 */

export interface ChaojiyingErrorOptions {
  errNo?: number;
  errStr?: string;
  responseBody?: unknown;
}

export class ChaojiyingError extends Error {
  /** Numerical error code returned by Chaojiying (`err_no`), if available. */
  public readonly errNo?: number;
  /** Chinese or descriptive error string returned by Chaojiying (`err_str`). */
  public readonly errStr?: string;
  /** Full response body from Chaojiying. */
  public readonly responseBody?: unknown;

  constructor(message: string, options?: ChaojiyingErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.errNo = options?.errNo;
    this.errStr = options?.errStr;
    this.responseBody = options?.responseBody;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ChaojiyingAPIError extends ChaojiyingError {}

export class UserParameterError extends ChaojiyingAPIError {}
export class AccessTokenError extends ChaojiyingAPIError {}
export class UnknownUserError extends ChaojiyingAPIError {}
export class PasswordError extends ChaojiyingAPIError {}
export class CodeTypeError extends ChaojiyingAPIError {}
export class InsufficientPointsError extends ChaojiyingAPIError {}
export class NoResourcePackError extends ChaojiyingAPIError {}
export class InvalidImageError extends ChaojiyingAPIError {}
export class Base64ParseError extends ChaojiyingAPIError {}
export class ImageTooLargeError extends ChaojiyingAPIError {}
export class UnrecognizableImageError extends ChaojiyingAPIError {}
export class IpWhitelistError extends ChaojiyingAPIError {}
export class IpBlacklistError extends ChaojiyingAPIError {}
export class UploadError extends ChaojiyingAPIError {}
export class RateLimitError extends ChaojiyingAPIError {}
export class InvalidPictureIdError extends ChaojiyingAPIError {}
export class ErrorRateTooHighError extends ChaojiyingAPIError {}
export class PictureAlreadyReportedError extends ChaojiyingAPIError {}
export class ReportNotSupportedError extends ChaojiyingAPIError {}
export class MissingClickInstructionError extends ChaojiyingAPIError {}
export class BadClickInstructionError extends ChaojiyingAPIError {}
export class MalformedBase64Error extends ChaojiyingAPIError {}
export class MissingCredentialsError extends ChaojiyingError {}
export class NetworkError extends ChaojiyingError {
  public readonly status?: number;
  /** True when no HTTP response was received (connection refused, DNS, reset). */
  public readonly connectFailure: boolean;

  constructor(
    message: string,
    options?: ChaojiyingErrorOptions & { status?: number; connectFailure?: boolean }
  ) {
    super(message, options);
    this.status = options?.status;
    this.connectFailure = options?.connectFailure ?? false;
  }
}
export class TimeoutError extends ChaojiyingError {}
export class ResponseIntegrityError extends ChaojiyingError {}

export interface ErrorCodeInfo {
  errNo: number;
  errStr: string;
  remedy: string;
  ctor: new (message: string, options?: ChaojiyingErrorOptions) => ChaojiyingAPIError;
}

export const ERROR_CODES: readonly ErrorCodeInfo[] = [
  { errNo: -1001, errStr: "用户参数异常", remedy: "Send a valid username and password, or contact the software vendor.", ctor: UserParameterError },
  { errNo: -10012, errStr: "access_token异常", remedy: "Send a valid access_token.", ctor: AccessTokenError },
  { errNo: -1002, errStr: "无此用户名", remedy: "Send the Chaojiying account name, not the developer account.", ctor: UnknownUserError },
  { errNo: -10023, errStr: "用户名的密码出错", remedy: "Send the correct password. Reset it in the user center if needed.", ctor: PasswordError },
  { errNo: -1004, errStr: "类型参数错误", remedy: "Send a codetype from the price table.", ctor: CodeTypeError },
  { errNo: -1005, errStr: "无可用题分", remedy: "Recharge points in the user center.", ctor: InsufficientPointsError },
  { errNo: -10052, errStr: "无可用资源包", remedy: "Buy the resource pack required by this codetype (for example 8601).", ctor: NoResourcePackError },
  { errNo: -10061, errStr: "不是有效的图片文件", remedy: "Upload a real bmp, jpg, jpeg, or png image.", ctor: InvalidImageError },
  { errNo: -100612, errStr: "base64字符解析异常", remedy: "Send raw base64 with no data-URI prefix, spaces, or line breaks.", ctor: Base64ParseError },
  { errNo: -10062, errStr: "文件超大 1024k", remedy: "Keep paid uploads at or below 1024KB. Free OCR allows 2MB.", ctor: ImageTooLargeError },
  { errNo: -10064, errStr: "图片无法被识别", remedy: "Skip this image and submit the next one.", ctor: UnrecognizableImageError },
  { errNo: -10071, errStr: "IP受限", remedy: "Check the IP allow-list in the user center.", ctor: IpWhitelistError },
  { errNo: -10072, errStr: "IP受限", remedy: "Check the IP block-list in the user center.", ctor: IpBlacklistError },
  { errNo: -2001, errStr: "上传图片出错", remedy: "The upload failed. Retry once, then contact the vendor if it persists.", ctor: UploadError },
  { errNo: -429, errStr: "请求过于频繁", remedy: "Wait and retry. The client retries this code when retries > 0.", ctor: RateLimitError },
  { errNo: -1011, errStr: "图片ID异常", remedy: "Send the pic_id from a recent recognize response.", ctor: InvalidPictureIdError },
  { errNo: -1013, errStr: "错误率太高", remedy: "Stop reporting and check why answers are being marked wrong.", ctor: ErrorRateTooHighError },
  { errNo: -10132, errStr: "此图片ID已报过", remedy: "This pic_id was already reported.", ctor: PictureAlreadyReportedError },
  { errNo: -10133, errStr: "no_access", remedy: "This codetype does not support ReportError.", ctor: ReportNotSupportedError },
  { errNo: -10042, errStr: "缺少8a指令", remedy: "codetype 9801 requires str_debug {8a:字,符/8a}.", ctor: MissingClickInstructionError },
  { errNo: -10043, errStr: "8a指令异常", remedy: "Use half-width braces, colons, commas, and the /8a closer.", ctor: BadClickInstructionError },
  { errNo: -3002, errStr: "base64字符异常", remedy: "Remove whitespace and the data:image prefix before sending file_base64.", ctor: MalformedBase64Error },
];

const ERROR_BY_CODE = new Map(ERROR_CODES.map((info) => [info.errNo, info]));

export function describeErrorCode(errNo: number): ErrorCodeInfo | undefined {
  return ERROR_BY_CODE.get(errNo);
}

export function createApiError(
  errNo: number,
  errStr: string | undefined,
  responseBody?: unknown
): ChaojiyingAPIError {
  const known = ERROR_BY_CODE.get(errNo);
  const text = errStr || known?.errStr || "Unknown error";
  const message = `Chaojiying error ${errNo}: ${text}`;
  const options: ChaojiyingErrorOptions = { errNo, errStr: text, responseBody };
  const Ctor = known?.ctor ?? ChaojiyingAPIError;
  return new Ctor(message, options);
}
