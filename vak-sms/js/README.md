# vak-sms

TypeScript and Node.js client for the [VAK-SMS API](https://vak-sms.com/en/api/).

## Features

- Virtual phone numbers and SMS OTP reception across international countries and operators
- Complete activation lifecycle management (`send`, `end`, `bad`, and automatic polling)
- Real-time stock counts and prices per service
- Written in TypeScript with full type declarations and TSDoc

## Installation

```bash
npm install vak-sms
```

## Quick Start

```typescript
import { VakSmsClient } from 'vak-sms';

const client = new VakSmsClient({
  apiKey: process.env.VAK_SMS_API_KEY!,
});

async function main() {
  // Check account balance
  const balance = await client.getBalance();
  console.log(`Account balance: ${balance} RUB`);

  // List supported countries and network operators
  const countries = await client.getCountryList();
  console.log(`Supported countries count: ${countries.length}`);
}

main().catch(console.error);
```

## Ordering a Virtual Number and Receiving SMS

```typescript
import { VakSmsClient } from 'vak-sms';

const client = new VakSmsClient({ apiKey: 'YOUR_API_KEY' });

async function activateNumber() {
  // Order a number for Telegram in Russia
  const order = await client.getNumber({
    service: 'tg',
    country: 'ru',
  });

  console.log(`Phone: ${order.tel}`);
  console.log(`Operation ID: ${order.idNum}`);

  // Wait for incoming SMS code (polls every 3 seconds up to 2 minutes)
  const code = await client.waitForCode(order.idNum, { timeoutMs: 120000 });
  if (code) {
    console.log(`Received SMS code: ${code}`);
    // Complete activation
    await client.setStatus(order.idNum, 'end');
  } else {
    // If no code arrived, cancel/release the number
    await client.setStatus(order.idNum, 'bad');
  }
}
```

## API Methods

- `getBalance(): Promise<number>` — Returns the current balance in RUB.
- `getNumber(options: GetNumberOptions): Promise<VakNumber>` — Orders a virtual phone number.
- `prolongNumber(service, tel, softId?): Promise<VakNumber>` — Extends the duration of an existing number.
- `getSmsCode(idNum, all?): Promise<string | string[] | null>` — Retrieves received SMS code(s).
- `waitForCode(idNum, options?): Promise<string | null>` — Polls until SMS code arrives or times out.
- `setStatus(idNum, status): Promise<string>` — Updates activation status (`send`, `end`, `bad`).
- `getCountNumber(service, country?, operator?): Promise<CountNumber>` — Returns quantity and price for a service.
- `getCountryList(): Promise<CountryOperator[]>` — Retrieves all supported countries and operators.
- `getCountNumbersList(country?, operator?, rent?): Promise<Record<string, unknown>>` — Retrieves inventory catalog.

## License

ISC
