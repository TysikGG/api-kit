# SideShift — JavaScript

The `sideshift` package provides a TypeScript/JavaScript client for the [SideShift.ai REST API v2](https://docs.sideshift.ai).

```sh
npm i sideshift
```

## Quick Check

Check shift creation permissions and inspect a trading pair's exchange rate without creating orders:

```ts
import { SideShift } from 'sideshift';

const client = new SideShift();

const permissions = await client.getPermissions();
console.log(`Can create shift: ${permissions.createShift}`);

const pair = await client.getPair('eth', 'ethereum', 'btc', 'bitcoin');
console.log(`ETH/BTC Rate: ${pair.rate} (Min: ${pair.min}, Max: ${pair.max})`);
```

Source: `sideshift/js/examples/check.ts`.

The generated method reference is in [.github/docs/sideshift/js](js/README.md).
