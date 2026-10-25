# peak-client

[![npm version](https://img.shields.io/npm/v/peak-client.svg)](https://www.npmjs.com/package/peak-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/peak-client.svg)](https://nodejs.org)

Fast, fully typed TypeScript / Node.js client for the [Peak Solutions CAPTCHA Solving API](https://peak.fo/docs). Solve Cloudflare Turnstile widgets and Cloudflare 5-second challenges (WAF / Under Attack Mode) with a single API call.

Official API documentation: <https://peak.fo/docs>

---

## Features

- ⚡ **Cloudflare Turnstile** — Solves Cloudflare Turnstile in under 1 second with support for both proxyless and proxied modes.
- 🛡️ **Cloudflare 5s Challenge** — Automated WAF clearance with cookies, headers, and form-attributes for seamless HTTP session continuation.
- 💰 **Account Balance** — Real-time tracking of pay-per-solve credits and package subscription days remaining.
- 📦 **Dual Module Format** — Native ES Modules and CommonJS support with complete TypeScript type declarations.
- 🚨 **Robust Error Handling** — Specific `PeakError` exception class with status codes and API error messages.

---

## Installation

```bash
npm install peak-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance. It does not perform solves or spend credits.

### TypeScript / ESM

```ts
import { Peak } from "peak-client";

const client = new Peak({
  apiKey: process.env.PEAK_API_KEY!,
});

const balance = await client.getBalance();

if (balance.type === "pay_per_solve") {
  console.log(`Balance: $${balance.balance}`);
} else {
  console.log(`Package: ${balance.package}, Days left: ${balance.days_remaining}`);
}
```

### CommonJS

```js
const { Peak } = require("peak-client");

async function main() {
  const client = new Peak({
    apiKey: process.env.PEAK_API_KEY,
  });

  const balance = await client.getBalance();
  console.log("Account balance:", balance);
}

main().catch(console.error);
```

---

## Usage Guide

### 1. Solving Cloudflare Turnstile (Proxyless)

For sites that accept the Turnstile verification token from any IP address:

```ts
import { Peak } from "peak-client";

const client = new Peak(process.env.PEAK_API_KEY!);

const { token } = await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAAx...",
});

console.log(`cf-turnstile-response token: ${token}`);
```

### 2. Solving Cloudflare Turnstile (With Proxy)

For sites that validate the solve origin matches the requesting IP address:

```ts
const { token } = await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAAx...",
  proxy: "http://user:pass@1.2.3.4:8080",
  action: "login",
});
```

### 3. Solving Cloudflare 5-Second Challenge (WAF)

Solves the Cloudflare challenge page and returns session credentials:

```ts
const targetUrl = "https://example.com/";
const proxy = "http://user:pass@1.2.3.4:8080";

const solution = await client.solveCloudflare5s({
  url: targetUrl,
  proxy,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
});

// Step 1: Apply cookies to your session
console.log("Clearance cookies:", solution.cookies);

// Step 2: Use the exact user-agent
console.log("User-Agent:", solution.headers["user-agent"]);

// Step 3: Target Referer with challenge token
const referer = `${targetUrl}?__cf_chl_tk=${solution.cf_rt}`;
console.log("Referer:", referer);

// Step 4: POST solution.attributes as form-data to the target URL
console.log("Form attributes:", solution.attributes);
```

---

## Error Handling

When an error occurs, the client throws a `PeakError`:

```ts
import { Peak, PeakError } from "peak-client";

try {
  const client = new Peak("invalid_key");
  await client.getBalance();
} catch (err) {
  if (err instanceof PeakError) {
    console.error(`Peak error [HTTP ${err.status}]: ${err.message}`);
  }
}
```

Common status codes:
- `200` with non-fatal error: solve attempt failed (not billed).
- `400`: missing or invalid parameters.
- `401`: missing, invalid, or expired API key.
- `402`: insufficient account balance.
- `429`: rate limit reached.
- `502`: target site unreachable or timed out.

---

## License

[ISC](LICENSE) © api-kit contributors
