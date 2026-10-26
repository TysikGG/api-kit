# give-sms

TypeScript/JavaScript client for the [Give-SMS](https://give-sms.com/api.html) virtual number and SMS activation API.

## Installation

```bash
npm install give-sms
```

## Quick Start

```ts
import { GiveSms } from 'give-sms';

const client = new GiveSms({
  apiKey: process.env.GIVE_SMS_API_KEY || 'your-api-key',
});

async function run() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Balance: ${balance}`);

  // Check service availability
  const counts = await client.getCount({ country: 'kazakhstan' });
  console.log('Available services:', counts);
}

run();
```

## Features

- Full coverage of Give-SMS native JSON API (`/api/v1/`):
  - `getBalance()`
  - `getCount(options)`
  - `getNumber(options)`
  - `getCode(id)`
  - `repeatCode(id)`
  - `cancelNumber(id)`
  - `banNumber(id)`
  - `getReactivationOptions(id)`
  - `reactivate(id)`
  - `getAll()`
- Full coverage of SMS-Activate compatible handler endpoint (`/stubs/handler_api.php`):
  - `handlerGetBalance()`
  - `handlerGetNumbersStatus(options)`
  - `handlerGetNumber(options)`
  - `handlerSetStatus(id, status)`
  - `handlerGetStatus(id)`
  - `handlerGetPrices(options)`
- Complete TypeScript definitions and TSDoc reference.
- Built-in error handling via `GiveSmsError`.

## License

ISC
