# capguru-client

TypeScript/JavaScript client for the [CapGuru](https://cap.guru/api-docs/) AI-powered and human-assisted CAPTCHA solving API.

## Installation

```bash
npm install capguru-client
```

## Quick Start

```ts
import { CapGuruClient } from 'capguru-client';

const client = new CapGuruClient({
  apiKey: process.env.CAPGURU_API_KEY || 'your-api-key',
});

async function run() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Balance: ${balance}`);

  // Solve Cloudflare Turnstile
  const token = await client.solveTurnstile({
    sitekey: '0x4AAAAAAABnOYoqxxxxxx',
    pageurl: 'https://example.com',
  });
  console.log(`Turnstile token: ${token}`);
}

run();
```

## Features

- Full support for CapGuru recognition types:
  - `solveImage(options)`: Normal image and OCR captchas.
  - `solveText(question)`: Question-based text captchas.
  - `solveRecaptchaV2(options)`: Google reCAPTCHA v2 (checkbox & invisible).
  - `solveRecaptchaV3(options)`: Google reCAPTCHA v3 with score threshold.
  - `solveTurnstile(options)`: Cloudflare Turnstile CAPTCHA.
  - `solveHCaptcha(options)`: hCaptcha challenges.
  - `solveFunCaptcha(options)`: Arkose Labs FunCaptcha.
  - `solveGeeTest(options)`: GeeTest v3.
- Complete asynchronous task lifecycle (`createTask`, `getTaskResult`, `waitForResult`).
- Feedback reporting (`reportGood`, `reportBad`).
- Account balance checking (`getBalance`).
- Built-in error handling via `CapGuruError`.

## License

ISC
