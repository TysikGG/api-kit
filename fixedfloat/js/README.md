# fixedfloat-client

TypeScript and JavaScript client library for the [FixedFloat](https://fixedfloat.com/api) cryptocurrency exchange API v2.

## Installation

```bash
npm install fixedfloat-client
```

## Quick Start

```typescript
import { FixedFloat } from "fixedfloat-client";

const ff = new FixedFloat({
  apiKey: process.env.FIXEDFLOAT_API_KEY,
  apiSecret: process.env.FIXEDFLOAT_API_SECRET,
});

// Fetch supported currencies
const currencies = await ff.getCurrencies();
console.log(`Available currencies: ${currencies.length}`);

// Get exchange rate estimate
const price = await ff.getPrice({
  fromCcy: "BTC",
  toCcy: "ETH",
  amount: 0.1,
  direction: "from",
  type: "float",
});
console.log(`Estimated receive amount: ${price.to.amount} ETH`);
```

## Features

- Fully typed with TypeScript definitions
- Automatic HMAC-SHA256 request signing
- Supports all FixedFloat API v2 endpoints:
  - Currencies list (`getCurrencies`)
  - Rate and price estimates (`getPrice`)
  - Order creation (`createOrder`)
  - Order status tracking (`getOrder`)
  - Emergency actions (`setEmergency`)
  - Email notification updates (`setEmail`)
  - QR codes (`getQr`)

## Documentation

Full API documentation and reference are available in the [FixedFloat Documentation](https://tysikgg.github.io/api-kit/fixedfloat/js/).
Official API documentation: [https://fixedfloat.com/api](https://fixedfloat.com/api).

## License

MIT
