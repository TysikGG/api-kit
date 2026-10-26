# 2Captcha — JavaScript

The `2captcha-client` package provides a TypeScript/JavaScript client for the [2Captcha API](https://2captcha.com/api-docs).

```sh
npm i 2captcha-client
```

## Quick Check

Check account balance and solve a Turnstile challenge:

```ts
import { TwoCaptchaClient } from '2captcha-client';

const client = new TwoCaptchaClient({
  apiKey: process.env.TWOCAPTCHA_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: $${balance}`);

const token = await client.solveTurnstile({
  sitekey: '0x4AAAAAAABnOYoqxxxxxx',
  pageurl: 'https://example.com',
});
console.log(`Turnstile token: ${token}`);
```

Source: `twocaptcha/js/examples/check.ts`.

The generated method reference is in [.github/docs/twocaptcha/js](js/README.md).
