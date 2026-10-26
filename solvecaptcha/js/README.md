# solvecaptcha

TypeScript and Node.js client for the [SolveCaptcha API](https://solvecaptcha.com/captcha-solver-api).

## Features

- Solves normal image captchas, text questions, Google reCAPTCHA (v2/v3), Cloudflare Turnstile, FunCaptcha, and GeeTest
- Built-in polling mechanism with configurable timeout and intervals
- Support for feedback reporting (`reportGood`, `reportBad`) for accuracy tracking
- Written in TypeScript with complete type declarations and TSDoc

## Installation

```bash
npm install solvecaptcha
```

## Quick Start

```typescript
import { SolveCaptchaClient } from 'solvecaptcha';

const client = new SolveCaptchaClient({
  apiKey: process.env.SOLVECAPTCHA_API_KEY!,
});

async function main() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Current balance: $${balance.toFixed(4)}`);
}

main().catch(console.error);
```

## Solving Captchas

### Image Captcha

```typescript
import { SolveCaptchaClient } from 'solvecaptcha';

const client = new SolveCaptchaClient({ apiKey: 'YOUR_API_KEY' });

const solution = await client.solveImage({
  body: 'iVBORw0KGgoAAAANSUhEUgAA...', // Base64-encoded image
  numeric: 4, // Both numbers and letters
});

console.log(`Solved text: ${solution}`);
```

### Google reCAPTCHA V2

```typescript
const token = await client.solveRecaptchaV2({
  googlekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
  pageurl: 'https://example.com/login',
});

console.log(`reCAPTCHA token: ${token}`);
```

### Cloudflare Turnstile

```typescript
const token = await client.solveTurnstile({
  sitekey: '0x4AAAAAAABnEBq1w7gYv_m-',
  pageurl: 'https://example.com/protected',
});

console.log(`Turnstile token: ${token}`);
```

## API Methods

- `getBalance(): Promise<number>` — Returns the current balance in USD.
- `solveImage(options: ImageCaptchaOptions | string): Promise<string>` — Solves an image captcha.
- `solveText(text: string, options?: TextCaptchaOptions): Promise<string>` — Solves a text question captcha.
- `solveRecaptchaV2(options: RecaptchaV2Options): Promise<string>` — Solves Google reCAPTCHA V2.
- `solveRecaptchaV3(options: RecaptchaV3Options): Promise<string>` — Solves Google reCAPTCHA V3.
- `solveTurnstile(options: TurnstileOptions): Promise<string>` — Solves Cloudflare Turnstile.
- `solveFunCaptcha(options: FunCaptchaOptions): Promise<string>` — Solves Arkose Labs FunCaptcha.
- `solveGeeTest(options: GeeTestOptions): Promise<GeeTestResult>` — Solves GeeTest.
- `createTask(params): Promise<string>` — Submits a task to `/in.php` and returns task ID.
- `getTaskResult(taskId): Promise<string | null>` — Checks task resolution status.
- `waitForResult(taskId, timeoutMs?, intervalMs?): Promise<string>` — Polls until task is solved.
- `reportGood(taskId): Promise<boolean>` — Submits positive accuracy feedback.
- `reportBad(taskId): Promise<boolean>` — Submits incorrect solution report.

## License

ISC
