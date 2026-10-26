# VAK-SMS — JavaScript

The `vak-sms-client` package provides a TypeScript/JavaScript client for the [VAK-SMS API](https://vak-sms.com/en/api/).

```sh
npm i vak-sms-client
```

## Quick Check

Check account balance and browse supported countries without purchasing any numbers:

```ts
import { VakSmsClient } from 'vak-sms-client';

const client = new VakSmsClient({
  apiKey: process.env.VAK_SMS_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance} RUB`);

const countries = await client.getCountryList();
console.log(`Available countries: ${countries.length}`);
```

Source: `vak-sms/js/examples/quickstart.ts`.

The generated method reference is in [.github/docs/vak-sms/js](js/README.md).
