# SMSBower — JavaScript

The `smsbower-client` package provides a TypeScript/JavaScript client for the [SMSBower API](https://smsbower.app/api?page=client).

```sh
npm i smsbower-client
```

## Quick Check

Check account balance and browse supported services without placing any orders:

```ts
import { SmsBowerClient } from 'smsbower-client';

const client = new SmsBowerClient({
  apiKey: process.env.SMSBOWER_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: $${balance}`);

const services = await client.getServicesList();
console.log(`Available services: ${services.length}`);
```

Source: `smsbower/js/examples/quickstart.ts`.

The generated method reference is in [docs/smsbower/js](js/README.md).
