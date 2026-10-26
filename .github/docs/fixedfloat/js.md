# FixedFloat — JavaScript

The `fixedfloat-client` package provides a TypeScript/JavaScript client for the [FixedFloat API v2](https://fixedfloat.com/api).

```sh
npm i fixedfloat-client
```

## Quick Check

Retrieve available currencies and calculate exchange rate estimates without creating orders:

```ts
import { FixedFloat } from 'fixedfloat-client';

const client = new FixedFloat({
  apiKey: process.env.FIXEDFLOAT_API_KEY,
  apiSecret: process.env.FIXEDFLOAT_API_SECRET,
});

const currencies = await client.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);

const price = await client.getPrice({
  fromCcy: 'BTC',
  toCcy: 'ETH',
  amount: 0.1,
  direction: 'from',
  type: 'float',
});
console.log(`0.1 BTC -> ${price.to.amount} ETH`);
```

Source: `fixedfloat/js/examples/check.ts`.

The generated method reference is in [.github/docs/fixedfloat/js](js/README.md).
