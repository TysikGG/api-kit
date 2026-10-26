# SimpleSwap — JavaScript

The `simpleswap-client` package provides a TypeScript/JavaScript client for the [SimpleSwap](https://simpleswap.io/en/affiliate-program/help-center/article/public-api-guide) cryptocurrency exchange API (v3).

```sh
npm i simpleswap-client
```

## Quick Check

Read supported currencies and calculate estimated exchange rate without creating orders:

```ts
import { SimpleSwap } from "simpleswap-client";

const client = new SimpleSwap({
  apiKey: process.env.SIMPLESWAP_API_KEY!,
});

const currencies = await client.getCurrencies();
console.log(`Currencies available: ${currencies.length}`);

const estimate = await client.getEstimate({
  tickerFrom: "btc",
  tickerTo: "eth",
  networkFrom: "btc",
  networkTo: "eth",
  amount: "0.1",
});
console.log(`0.1 BTC -> ${estimate.estimatedAmount} ETH`);
```

Source: `simpleswap/js/examples/quickstart.ts`.

The generated method reference is in [.github/docs/simpleswap/js](js/README.md).
