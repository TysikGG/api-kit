# smsbower-client

TypeScript and Node.js client for the [SMSBower API](https://smsbower.app/api?page=client).

## Features

- Full support for SMSBower activation APIs (v1 and v2)
- Fast balance inquiries, real-time SMS status checks, and lifecycle management
- Catalogs for supported services, countries, and live price tiers
- Built with TypeScript with complete type declarations and TSDoc

## Installation

```bash
npm install smsbower-client
```

## Quick Start

```typescript
import { SmsBowerClient } from 'smsbower-client';

const client = new SmsBowerClient({
  apiKey: process.env.SMSBOWER_API_KEY!,
});

async function main() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Current balance: $${balance}`);

  // Fetch available services
  const services = await client.getServicesList();
  console.log(`Found ${services.length} services`);

  // Fetch active countries
  const countries = await client.getCountries();
  console.log('Available countries:', Object.keys(countries).length);
}

main().catch(console.error);
```

## Ordering a Virtual Number

```typescript
import { SmsBowerClient } from 'smsbower-client';

const client = new SmsBowerClient({ apiKey: 'YOUR_API_KEY' });

async function activateNumber() {
  // Request number for Telegram ('tg') in India ('22')
  const activation = await client.getNumber({
    service: 'tg',
    country: '22',
  });

  console.log(`Order ID: ${activation.id}`);
  console.log(`Phone Number: ${activation.number}`);

  // Poll for incoming SMS code
  const status = await client.getStatus(activation.id);
  if (status.status === 'STATUS_OK') {
    console.log(`Received code: ${status.code}`);
    // Complete activation
    await client.setStatus(activation.id, 6);
  }
}
```

## API Methods

- `getBalance(): Promise<number>` — Returns the current balance.
- `getNumber(options: GetNumberOptions): Promise<ActivationNumber>` — Requests a virtual phone number.
- `getNumberV2(options: GetNumberOptions): Promise<ActivationNumberV2>` — Requests a number with detailed metadata.
- `getStatus(id: string | number): Promise<ActivationStatus>` — Checks current status and retrieves SMS code.
- `setStatus(id: string | number, status: number): Promise<string>` — Updates activation lifecycle status (1: ready, 3: retry, 6: complete, 8: cancel).
- `getPrices(service?, country?): Promise<PricesResult>` — Retrieves standard price catalog.
- `getPricesV2(service?, country?): Promise<PricesV2Result>` — Retrieves detailed price points.
- `getPricesV3(service?, country?): Promise<PricesV3Result>` — Retrieves provider-specific pricing.
- `getServicesList(): Promise<ServiceItem[]>` — Retrieves all supported services.
- `getCountries(): Promise<Record<string, CountryItem>>` — Retrieves all supported countries.
- `getTopCountriesByService(service: string): Promise<Record<string, any>>` — Retrieves top countries and gold partners.
- `getActualWalletAddress(coin: string, network: string): Promise<{ wallet_address: string }>` — Generates deposit address.

## License

ISC
