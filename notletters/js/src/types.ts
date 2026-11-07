/**
 * Types of emails available for purchase on NotLetters.
 */
export const EmailType = {
  /** Limited emails (Лимитные) */
  LIMIT: 0,
  /** Unlimited emails (Безлимитные) */
  UNLIMITED: 1,
  /** Russian zone emails (RU зона) */
  RU_ZONE: 2,
  /** Personal emails (Личные) */
  PERSONAL: 3,
} as const;

export type EmailType = (typeof EmailType)[keyof typeof EmailType];

/**
 * Filter criteria for retrieving emails from a mailbox.
 */
export interface LetterFilters {
  /** Search query matching email content, subject, or sender */
  search?: string;
  /** Filter by starred status */
  star?: boolean;
}

/**
 * Parameters for retrieving emails from a mailbox.
 */
export interface GetLettersParams {
  /** Mailbox email address */
  email: string;
  /** Mailbox password */
  password: string;
  /** Optional filter parameters */
  filters?: LetterFilters;
}

/**
 * The body contents of an email message.
 */
export interface LetterBody {
  /** HTML version of the message */
  html: string;
  /** Plain text version of the message */
  text: string;
}

/**
 * A retrieved email message.
 */
export interface Letter {
  /** Unique identifier of the message */
  id: string;
  /** Sender email address */
  sender: string;
  /** Sender display name */
  sender_name: string;
  /** Email subject */
  subject: string;
  /** Message content with HTML and plain text */
  letter: LetterBody;
  /** Starred flag */
  star: boolean;
  /** Unix timestamp of the email */
  date: number;
}

/**
 * User account information and balance.
 */
export interface UserData {
  /** User account ID */
  id: string;
  /** Username */
  username: string;
  /** Account balance */
  balance: number;
  /** Rate limit per minute */
  rate_limit: number;
}

/**
 * Parameters for purchasing emails.
 */
export interface BuyEmailsParams {
  /** Number of emails to buy (minimum 1) */
  count: number;
  /** Mailbox type code */
  typeEmail?: EmailType;
  /** Mailbox type code (snake_case alias) */
  type_email?: EmailType;
}

/**
 * Purchased email account credentials.
 */
export interface MailAccount {
  /** Mailbox email address */
  email: string;
  /** Mailbox password */
  password: string;
  /** Raw format "email:password" */
  raw: string;
}

/**
 * Parameters for changing a mailbox password.
 */
export interface ChangePasswordParams {
  /** Mailbox email address */
  email: string;
  /** New mailbox password */
  newPassword?: string;
  /** New mailbox password (snake_case alias) */
  new_password?: string;
  /** Current mailbox password */
  oldPassword?: string;
  /** Current mailbox password (snake_case alias) */
  old_password?: string;
}

/**
 * Response for changing a mailbox password.
 */
export interface ChangePasswordResponse {
  /** Status code */
  code: number;
  /** Response status message */
  data: string;
}

/**
 * Configuration options for the NotLetters client.
 */
export interface NotLettersClientOptions {
  /** API token from https://notletters.com/user/settings */
  apiToken?: string;
  /** Base URL of the API. Defaults to https://api.notletters.com/v1 */
  baseURL?: string;
  /** Request timeout in milliseconds. Defaults to 30000 (30 seconds) */
  timeoutMs?: number;
  /** Custom User-Agent header */
  userAgent?: string;
}
