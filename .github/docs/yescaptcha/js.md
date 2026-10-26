# YesCaptcha — JavaScript

The `yescaptcha-client` library calls the [YesCaptcha Recognition API](https://docs.yescaptcha.com). Supports reCAPTCHA, hCaptcha, Cloudflare Turnstile, FunCaptcha, and AWS WAF.

```sh
npm i yescaptcha-client
```

Check the client without submitting a task:

```ts
import { YesCaptcha } from "yescaptcha-client";

const client = new YesCaptcha({
  clientKey: process.env.YESCAPTCHA_CLIENT_KEY!,
});

const balance = await client.getBalance();
console.log("YesCaptcha balance:", balance.balance);
```

Source: `yescaptcha/js/examples/check.ts`.

The generated method reference is in [.github/docs/yescaptcha/js](js/README.md).
