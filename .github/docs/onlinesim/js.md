# OnlineSIM — JavaScript

The `onlinesim` package provides a TypeScript/JavaScript client for the [OnlineSIM API](https://onlinesim.io/docs/api/en).

```sh
npm i onlinesim
```

## Quick Check

Check account balance and browse supported countries:

```ts
import { OnlineSim } from 'onlinesim';

const client = new OnlineSim({
  apiKey: process.env.ONLINESIM_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance}`);

const countries = await client.getCountries();
console.log('Supported countries:', countries);
```

Source: `onlinesim/js/examples/check.ts`.

The generated method reference is in [.github/docs/onlinesim/js](js/README.md).
