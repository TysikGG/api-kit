# SMSBulk — JavaScript

The `smsbulk-client` package provides a TypeScript/JavaScript client for the [SMSBulk](https://smsbulk.net/en/docs) virtual phone number and email verification API.

```sh
npm i smsbulk-client
```

## Quick Check

Read wallet balance and list available services without reserving any numbers:

```ts
import { SMSBulk } from "smsbulk-client";

const client = new SMSBulk({
  apiKey: process.env.SMSBULK_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance.balance} ${balance.currency}`);

const { data: services } = await client.getServices();
console.log(`Available services: ${services.length}`);
```

Source: `smsbulk/js/examples/quickstart.ts`.

The generated method reference is in [.github/docs/smsbulk/js](js/README.md).
