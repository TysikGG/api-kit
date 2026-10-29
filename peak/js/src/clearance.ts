import type { ClearanceRequest, Cloudflare5sResult } from "./types.js";
import { assertPageUrl } from "./util.js";

/** Join cookies the way an HTTP `Cookie` header expects. */
export function cookieHeader(cookies: Record<string, string> | undefined): string {
  if (!cookies) return "";
  return Object.entries(cookies)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

/**
 * Build the POST that finishes a Cloudflare 5-second challenge.
 *
 * Peak returns cookies, a user-agent, form attributes, and `cf_rt`.
 * The target then expects those cookies, the same user-agent, a Referer of
 * `{url}?__cf_chl_tk={cf_rt}`, and `attributes` as a form body.
 * Send that POST through the same sticky proxy you passed to the solve.
 */
export function buildClearanceRequest(
  targetUrl: string,
  solution: Cloudflare5sResult,
): ClearanceRequest {
  const url = assertPageUrl(targetUrl);
  const attributes = solution.attributes ?? {};
  const pairs: Array<[string, string]> = Object.entries(attributes).map(([key, value]) => [
    key,
    String(value),
  ]);
  const body = new URLSearchParams(pairs).toString();
  const userAgent = solution.headers?.["user-agent"] ?? "";
  const referer = `${url}?__cf_chl_tk=${solution.cf_rt ?? ""}`;
  const cookies = { ...(solution.cookies ?? {}) };
  return {
    url,
    method: "POST",
    body,
    cookies,
    cookieHeader: cookieHeader(cookies),
    referer,
    userAgent,
    headers: {
      "User-Agent": userAgent,
      Referer: referer,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookieHeader(cookies) ? { Cookie: cookieHeader(cookies) } : {}),
    },
  };
}

/** User-agent Peak says to keep using after a 5-second solve. */
export function clearanceUserAgent(solution: Cloudflare5sResult): string {
  return solution.headers?.["user-agent"] ?? "";
}
