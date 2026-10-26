# onlinesim

TypeScript/JavaScript client for the [OnlineSIM](https://onlinesim.io/docs/api/en) virtual number and SMS activation API.

## Installation

```bash
npm install onlinesim
```

## Quick Start

```ts
import { OnlineSim } from 'onlinesim';

const client = new OnlineSim({
  apiKey: process.env.ONLINESIM_API_KEY || 'your-api-key',
});

async function run() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Balance: ${balance}`);

  // Fetch available countries
  const countries = await client.getCountries();
  console.log('Supported countries:', countries);
}

run();
```

## Features

- Full coverage of OnlineSIM activation and rental endpoints:
  - `getBalance()`: Query user balance.
  - `getTariffs(country)`: List available activation pricing and stock.
  - `getServiceList(country)`: Service directory.
  - `getCountries()`: All supported countries.
  - `getNum(options)`: Order a virtual number for SMS reception.
  - `getState(tzid)`: Track order state and received SMS text/code.
  - `setOperationOk(tzid)`: Confirm order completion.
  - `setOperationRevise(tzid)`: Request repeat SMS message.
  - `getRentTariffs()`: Rental tariffs catalog.
  - `getRentNum(options)`: Order a long-term rental number.
  - `getRentState(tzid)`: Check rental number status and incoming SMS.
  - `closeRentNum(tzid)`: Release active rental number.
- Fully typed options and structured responses.
- Built-in error handling via `OnlineSimError`.

## License

ISC
