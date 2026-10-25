# BitcoinVN — JavaScript

The `bitcoinvn` client calls the [BitcoinVN Exchange API](https://bitcoinvn.io/api/doc.json). The base URL is `https://bitcoinvn.io`.

Create a key on the API keys page at [bitcoinvn.io](https://bitcoinvn.io) and pass it as `BITCOINVN_API_KEY`. Public reads work without a key. The specification has no key-management API.

```sh
npm i bitcoinvn
```

Check the client without creating an order:

```ts
import { BitcoinVn } from "bitcoinvn";

const client = new BitcoinVn({
  apiKey: process.env.BITCOINVN_API_KEY,
});

const ticker = await client.getTicker("BTC", "USDT");
console.log(ticker.rate, ticker.volume24h);
```

Source: `bitcoinvn/js/examples/check.ts`.

`createQuote` creates a live quote. `createOrder` creates a live order and always sends the hardcoded `referrer` in the JSON body. Those calls are not part of the check example.

The generated method reference is in [docs/bitcoinvn/js](bitcoinvn/js/README.md).
