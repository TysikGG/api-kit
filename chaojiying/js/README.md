# chaojiying-client

[![npm version](https://img.shields.io/npm/v/chaojiying-client.svg)](https://www.npmjs.com/package/chaojiying-client)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/chaojiying-client.svg)](https://nodejs.org)

Modern, fully typed TypeScript / Node.js client library for the [Chaojiying](https://www.chaojiying.com) (超级鹰) CAPTCHA recognition API.

Official API documentation: <https://www.chaojiying.com/api-5.html>

---

## Features

- 🖼️ **Image & Click Recognition** — Solves letters, numbers, calculations, Chinese characters, click-coordinate challenges, and question puzzles.
- 🔒 **Automatic Password Hashing** — Pass plain text password; the client automatically hashes it with MD5 (`pass2`).
- 🛡️ **Typed & Robust** — Complete TypeScript definitions for results (`ScoreResult`, `RecognizeResult`, `ReportErrorResult`).
- 📦 **Buffer & Base64 Inputs** — Accepts `Buffer`, `Uint8Array`, or raw Base64 data strings seamlessly.
- 💰 **Report Error & Refund** — Easy reporting of incorrectly recognized images to refund account points.

---

## Installation

```bash
npm install chaojiying-client
```

Requires Node.js 18 or higher.

---

## Quick Start (Safe Check)

The quick check queries your remaining account points without recognizing images or spending balance:

```typescript
import { Chaojiying } from "chaojiying-client";

const client = new Chaojiying({
  username: process.env.CHAOJIYING_USER!,
  password: process.env.CHAOJIYING_PASS!,
});

const score = await client.getScore();
console.log(`Available points: ${score.tifen}`);
console.log(`Locked points: ${score.tifen_lock}`);
```

---

## Usage Guide

### 1. Recognizing Standard 4-Digit CAPTCHA

Solve standard alphanumeric 4-digit verification images (`codeType: 1004`):

```typescript
import * as fs from "node:fs";
import { Chaojiying } from "chaojiying-client";

const client = new Chaojiying({
  username: "your_username",
  password: "your_password",
});

const imageBuffer = fs.readFileSync("captcha.jpg");

const result = await client.recognize(imageBuffer, 1004);
console.log(`Recognized Text: ${result.pic_str}`);
console.log(`Picture ID: ${result.pic_id}`);
console.log(`MD5: ${result.md5}`);
```

### 2. Click-on-Image / Coordinate Recognition

For coordinate-based CAPTCHAs (e.g. click characters in sequence):

```typescript
// codetype 9004: click 4 Chinese characters in order
const result = await client.recognize(imageBuffer, 9004);
console.log(`Click coordinates: ${result.pic_str}`);
// result.pic_str looks like: "124,156|245,88|90,210|310,140"
```

### 3. Reporting Incorrect Solutions for Points Refund

If a CAPTCHA was incorrectly solved by the platform, report its `pic_id` within the allowed time window to receive a refund:

```typescript
try {
  await client.reportError(result.pic_id);
  console.log("Error successfully reported. Points refunded.");
} catch (error) {
  console.error("Failed to report error:", error);
}
```

---

## Common Code Types (codetype)

| Code Type | Description |
| :--- | :--- |
| `1004` | 1–4 alphanumeric English letters / digits |
| `1005` | 1–5 alphanumeric English letters / digits |
| `1006` | 1–6 alphanumeric English letters / digits |
| `1902` | General English letters / digits (variable length) |
| `2004` | Chinese characters (1–4 characters) |
| `3004` | Math calculation (e.g. `3 + 5 = ?`) |
| `9004` | Coordinate click on 4 target characters |

Full list of code types is available at [Chaojiying Price Guide](https://www.chaojiying.com/price.html).

---

## API Reference

### `Chaojiying` Class

#### Constructor

```typescript
new Chaojiying(options: ChaojiyingOptions)
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `username` | `string` | `process.env.CHAOJIYING_USER` | Chaojiying account username. |
| `password` | `string` | `process.env.CHAOJIYING_PASS` | Chaojiying account password (plain or MD5). |
| `baseURL` | `string` | `"https://upload.chaojiying.net"` | Base URL for the API. |
| `timeoutMs` | `number` | `60000` | Request timeout in milliseconds. |

#### Methods

- **`getScore(): Promise<ScoreResult>`** — Checks account point balance. Returns `{ err_no, err_str, tifen, tifen_lock }`.
- **`recognize(image, codeType, options?): Promise<RecognizeResult>`** — Submits image for recognition. Returns `{ err_no, err_str, pic_id, pic_str, md5 }`.
- **`reportError(picId): Promise<ReportErrorResult>`** — Reports incorrectly solved CAPTCHA to request a point refund.

---

## Error Handling

When the Chaojiying API returns `err_no !== 0`, a `ChaojiyingError` is thrown:

```typescript
import { Chaojiying, ChaojiyingError } from "chaojiying-client";

try {
  const client = new Chaojiying({ username: "wrong", password: "wrong" });
  await client.getScore();
} catch (error) {
  if (error instanceof ChaojiyingError) {
    console.error(`Error Code: ${error.errNo}`);
    console.error(`Message: ${error.message}`);
  }
}
```

Common error codes:
- `-1001` — Insufficient points balance.
- `-1002` — Incorrect username or password.
- `-1003` — Account disabled or frozen.
- `-1005` — Unsupported code type.
- `-2001` — Image format or file corrupted.
- `-3001` — Recognition timeout.

---

## License

ISC
