export { NotLetters, parseMail } from "./client.js";
export {
  createNotLettersError,
  NotLettersBadRequestError,
  NotLettersError,
  NotLettersForbiddenError,
  NotLettersInternalServerError,
  NotLettersNotFoundError,
  NotLettersPaymentRequiredError,
  NotLettersUnauthorizedError,
} from "./errors.js";
export {
  BuyEmailsParams,
  ChangePasswordParams,
  ChangePasswordResponse,
  EmailType,
  GetLettersParams,
  Letter,
  LetterBody,
  LetterFilters,
  MailAccount,
  NotLettersClientOptions,
  UserData,
} from "./types.js";

import { NotLetters } from "./client.js";
export default NotLetters;
