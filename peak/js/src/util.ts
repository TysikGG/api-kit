import type { AxiosProxyConfig } from "axios";

import { BadRequestError } from "./errors.js";
import type { BalanceData, ProxyConfig, ProxyInput } from "./types.js";

const SOLVE_PROTOCOLS = new Set(["http", "https", "socks4", "socks5", "socks5h"]);

/** Add a trailing slash to the URL path without touching the query or fragment. */
export function ensureTrailingSlash(url: string): string {
  const parsed = new URL(url);
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  return parsed.toString();
}

/** Require an absolute http(s) URL without rewriting the path. */
export function assertHttpUrl(url: string, field = "url"): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    throw new BadRequestError(`${field} is required`);
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new BadRequestError(`${field} must be an absolute URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestError(`${field} must use http or https`);
  }
  return trimmed;
}

/** Require an absolute http(s) page URL and normalize its trailing slash. */
export function assertPageUrl(url: string, field = "url"): string {
  return ensureTrailingSlash(assertHttpUrl(url, field));
}

export function assertNonEmpty(value: string | undefined, field: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new BadRequestError(`${field} is required`);
  }
  return trimmed;
}

/** Serialize a proxy string or object to the form Peak expects. */
export function formatProxy(proxy: ProxyInput): string {
  if (typeof proxy === "string") {
    const trimmed = proxy.trim();
    if (!trimmed) {
      throw new BadRequestError("Proxy is empty");
    }
    return trimmed;
  }
  return formatProxyConfig(proxy);
}

function formatProxyConfig(proxy: ProxyConfig): string {
  const protocol = (proxy.protocol ?? "http").toLowerCase().replace(/:$/, "");
  if (!SOLVE_PROTOCOLS.has(protocol)) {
    throw new BadRequestError(
      `Unsupported proxy protocol "${protocol}". Use http, https, socks4, socks5, or socks5h.`,
    );
  }
  const host = formatHost(proxy.host);
  const port = proxy.port;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new BadRequestError("Proxy port must be an integer from 1 to 65535");
  }
  const auth =
    proxy.username != null && proxy.username !== ""
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password ?? "")}@`
      : "";
  return `${protocol}://${auth}${host}:${port}`;
}

function formatHost(host: string | undefined): string {
  const trimmed = host?.trim() ?? "";
  if (!trimmed) {
    throw new BadRequestError("Proxy host is required");
  }
  if (trimmed.includes(":") && !trimmed.startsWith("[")) {
    return `[${trimmed}]`;
  }
  return trimmed;
}

/**
 * Axios proxy config for reaching the Peak API.
 * SOCKS is rejected: Axios's built-in proxy agent speaks HTTP proxies only.
 */
export function axiosProxyConfig(proxyUrl: string): AxiosProxyConfig {
  const trimmed = proxyUrl.trim();
  if (!trimmed) {
    throw new BadRequestError("httpProxy is empty");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new BadRequestError("httpProxy must be an absolute URL");
  }
  const protocol = parsed.protocol.replace(":", "");
  if (protocol !== "http" && protocol !== "https") {
    throw new BadRequestError(
      "httpProxy must be an HTTP or HTTPS proxy URL. Pass SOCKS proxies on the solve proxy field.",
    );
  }
  const port = parsed.port
    ? Number(parsed.port)
    : protocol === "https"
      ? 443
      : 80;
  const config: AxiosProxyConfig = {
    protocol,
    host: parsed.hostname,
    port,
  };
  if (parsed.username) {
    config.auth = {
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  }
  return config;
}

/** Human-readable balance line for logs and examples. */
export function formatBalance(balance: BalanceData): string {
  if (balance.type === "pay_per_solve") {
    return `$${balance.balance}`;
  }
  const name = balance.package_name || balance.package || "package";
  const parts = [name];
  if (balance.remaining_solves != null) {
    const total =
      balance.total_solves != null ? `/${balance.total_solves}` : "";
    parts.push(`${balance.remaining_solves}${total} solves left`);
  }
  if (balance.days_remaining != null) {
    parts.push(`${balance.days_remaining} days left`);
  }
  return parts.join(", ");
}

export function clampRetries(value: number | undefined, fallback: number): number {
  const chosen = value ?? fallback;
  if (!Number.isFinite(chosen)) return 0;
  return Math.max(0, Math.floor(chosen));
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
