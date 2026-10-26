# 2captcha-client

TypeScript/JavaScript client for the [2Captcha](https://2captcha.com/api-docs) recognition and solving API.

## Installation

```bash
npm install 2captcha-client
```

## Quick Start

```ts
import { TwoCaptchaClient } from '2captcha-client';

const client = new TwoCaptchaClient({
  apiKey: process.env.TWOCAPTCHA_API_KEY || 'your-api-key',
});

async function run() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Balance: $${balance}`);

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

- Full support for 2Captcha captcha recognition types:
  - `solveImage(options)`: Normal image / OCR captchas.
  - `solveText(question)`: Question-based text captchas.
  - `solveRecaptchaV2(options)`: Google reCAPTCHA v2 (checkbox & invisible).
  - `solveRecaptchaV3(options)`: Google reCAPTCHA v3 with score threshold.
  - `solveTurnstile(options)`: Cloudflare Turnstile CAPTCHA.
  - `solveHCaptcha(options)`: hCaptcha challenge.
  - `solveFunCaptcha(options)`: Arkose Labs FunCaptcha.
  - `solveGeeTest(options)`: GeeTest v3.
- Complete asynchronous task lifecycle management (`createTask`, `getTaskResult`, `waitForResult`).
- Accuracy feedback reporting (`reportGood`, `reportBad`).
- Account balance retrieval (`getBalance`).
- Built-in error handling via `TwoCaptchaError`.

## License

ISC
