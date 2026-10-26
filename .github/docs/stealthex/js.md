# StealthEX — JavaScript

The `stealthex-client` package provides a TypeScript/JavaScript client for the [StealthEX](https://stealthex.io) non-custodial cryptocurrency exchange API.

```sh
npm i stealthex-client
```

## Quick Check

Read supported currencies and query exchange rate estimates without creating orders:

```ts
import { StealthEX } from "stealthex-client";

const client = new StealthEX({
  apiKey: process.env.STEALTHEX_API_KEY!,
});

const currencies = await client.getCurrencies();
console.log(`Currencies available: ${currencies.length}`);

const est = await client.getEstimate("btc", "eth", "0.1");
console.log(`0.1 BTC -> ${est.estimated_amount} ETH`);
```

Source: `stealthex/js/examples/quickstart.ts`.

The generated method reference is in [.github/docs/stealthex/js](js/README.md).
