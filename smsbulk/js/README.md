# smsbulk-client

Official TypeScript/JavaScript client for the [SMSBulk](https://smsbulk.net) virtual phone number and email verification API.

API Documentation: [https://smsbulk.net/en/docs](https://smsbulk.net/en/docs)

## Features

- **TypeScript-first**: Full type definitions for all API endpoints, parameters, and responses.
- **Virtual Numbers**: Reserve phone numbers, receive SMS verification codes, request resends, and cancel activations.
- **Email Activations**: Purchase disposable email addresses and read verification OTP codes.
- **Catalog & Pricing**: Query real-time availability and prices across hundreds of countries and services.
- **Zero Configuration**: Automatically picks up `SMSBULK_API_KEY` from environment variables.

## Installation

```bash
npm install smsbulk-client
```

## Quick Start

```typescript
import { SMSBulk } from "smsbulk-client";

const client = new SMSBulk({
  apiKey: process.env.SMSBULK_API_KEY,
});

async function main() {
  // Check wallet balance
  const balance = await client.getBalance();
  console.log(`Balance: ${balance.balance} ${balance.currency}`);

  // List available services
  const { data: services } = await client.getServices();
  console.log(`Services found: ${services.length}`);

  // Reserve a virtual number for WhatsApp in the US
  const activation = await client.createActivation({
    serviceCode: "wa",
    countryIso: "US",
  });
  console.log(`Number reserved: ${activation.phoneNumber}`);

  // Check activation status / retrieve SMS code
  const details = await client.getActivation(activation.id);
  if (details.status === "RECEIVED") {
    console.log(`Received code: ${details.smsCode}`);
  }
}

main().catch(console.error);
```

## API Overview

### Wallet & Account

- `client.getBalance()`: Get current balance and currency.
- `client.getTransactions(params?)`: List wallet transaction history.

### Services & Countries

- `client.getServices()`: List all supported services with stock and pricing.
- `client.getService(slug)`: Get detailed information for a single service.
- `client.getCountries()`: List all supported countries.
- `client.getServiceCountries(slug)`: List in-stock countries and prices for a service.

### SMS Activations

- `client.createActivation(params)`: Reserve a phone number for verification.
- `client.getActivations(params?)`: List user's activations.
- `client.getActivation(id)`: Get activation status and SMS code.
- `client.cancelActivation(id)`: Cancel reservation and refund balance.
- `client.completeActivation(id)`: Mark activation as finished.
- `client.resendActivation(id)`: Request an additional SMS code.

### Email Activations

- `client.getEmailDomains(site)`: List available email provider domains and prices for a site.
- `client.createEmailActivation(params)`: Purchase temporary email address.
- `client.getEmailActivations(params?)`: List user's email activations.
- `client.getEmailActivation(id)`: Get email activation status and parsed OTP code.
- `client.cancelEmailActivation(id)`: Cancel email activation.
- `client.reorderEmailActivation(id)`: Reopen email address for further codes.

## License

ISC
