# Swapzone — JavaScript

The `swapzone-client` package provides a TypeScript/JavaScript client for the [Swapzone](https://swapzone.io) instant cryptocurrency exchange and DEX aggregator API.

```sh
npm i swapzone-client
```

## Quick Check

Retrieve supported currencies and query live exchange rates without creating transactions:

```ts
import { Swapzone } from "swapzone-client";

const client = new Swapzone({
  apiKey: process.env.SWAPZONE_API_KEY!,
});

const currencies = await client.getCurrencies();
console.log(`Currencies available: ${currencies.length}`);

const rate = await client.getRate({
  from: "btc",
  to: "eth",
  amount: "0.1",
});
console.log(`0.1 BTC -> ${rate.amountTo} ETH via ${rate.adapter}`);
```

Source: `swapzone/js/examples/quickstart.ts`.

The generated method reference is in [.github/docs/swapzone/js](js/README.md).
