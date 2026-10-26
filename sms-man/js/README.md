# sms-man

TypeScript/JavaScript client for the [SMS-MAN](https://sms-man.com/site/api) virtual number and SMS activation API.

## Installation

```bash
npm install sms-man
```

## Quick Start

```ts
import { SmsMan } from 'sms-man';

const client = new SmsMan({
  token: process.env.SMSMAN_API_KEY || 'your-api-token',
});

async function run() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Balance: ${balance}`);

  // Fetch supported countries
  const countries = await client.getCountries();
  console.log('Countries:', countries);
}

run();
```

## Features

- Full coverage of SMS-MAN native control API (`/control/`):
  - `getBalance()`: Query account balance.
  - `getLimits(countryId, applicationId)`: Available stock limits.
  - `getPrices(countryId)`: Service pricing catalog.
  - `getCountries()`: List of supported countries.
  - `getApplications()`: List of supported applications and services.
  - `getNumber(countryId, applicationId)`: Order disposable virtual number.
  - `getSms(requestId)`: Receive verification SMS code.
  - `setStatus(requestId, status)`: Confirm or cancel number.
- Full coverage of SMS-Activate compatible handler endpoint (`/stubs/handler_api.php`):
  - `handlerGetBalance()`
  - `handlerGetNumber(country, service)`
  - `handlerGetStatus(id)`
  - `handlerSetStatus(id, status)`
  - `handlerGetPrices(country)`
- Complete TypeScript declarations and error handling via `SmsManError`.

## License

ISC
