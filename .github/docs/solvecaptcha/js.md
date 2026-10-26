# SolveCaptcha — JavaScript

The `solvecaptcha-client` package provides a TypeScript/JavaScript client for the [SolveCaptcha API](https://solvecaptcha.com/captcha-solver-api).

```sh
npm i solvecaptcha-client
```

## Quick Check

Check account balance without submitting any captchas:

```ts
import { SolveCaptchaClient } from 'solvecaptcha-client';

const client = new SolveCaptchaClient({
  apiKey: process.env.SOLVECAPTCHA_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: $${balance.toFixed(4)}`);
```

Source: `solvecaptcha/js/examples/quickstart.ts`.

The generated method reference is in [.github/docs/solvecaptcha/js](js/README.md).
