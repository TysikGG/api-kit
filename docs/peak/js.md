# Peak — JavaScript

The `peak-client` library calls the [Peak Solutions CAPTCHA Solving API](https://peak.fo/docs). Solve Cloudflare Turnstile widgets and Cloudflare 5-second challenges with a single API call.

```sh
npm i peak-client
```

Check the client without performing a solve:

```ts
import { Peak } from "peak-client";

const client = new Peak({
  apiKey: process.env.PEAK_API_KEY!,
});

const balance = await client.getBalance();
console.log("Peak balance:", balance);
```

Source: `peak/js/examples/check.ts`.

The generated method reference is in [docs/peak/js](js/README.md).
