# CapGuru — JavaScript

The `capguru-client` package provides a TypeScript/JavaScript client for the [CapGuru API](https://cap.guru/api-docs/).

```sh
npm i capguru-client
```

## Quick Check

Check account balance and solve a Turnstile challenge:

```ts
import { CapGuruClient } from 'capguru-client';

const client = new CapGuruClient({
  apiKey: process.env.CAPGURU_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: $${balance}`);

const token = await client.solveTurnstile({
  sitekey: '0x4AAAAAAABnOYoqxxxxxx',
  pageurl: 'https://example.com',
});
console.log(`Turnstile token: ${token}`);
```

Source: `capguru/js/examples/check.ts`.

The generated method reference is in [.github/docs/capguru/js](js/README.md).
