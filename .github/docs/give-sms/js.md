# Give-SMS — JavaScript

The `give-sms` package provides a TypeScript/JavaScript client for the [Give-SMS API](https://give-sms.com/api.html).

```sh
npm i give-sms
```

## Quick Check

Check account balance and browse available service counts without placing any orders:

```ts
import { GiveSms } from 'give-sms';

const client = new GiveSms({
  apiKey: process.env.GIVE_SMS_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance}`);

const counts = await client.getCount({ country: 'kazakhstan' });
console.log('Available services:', counts);
```

Source: `give-sms/js/examples/check.ts`.

The generated method reference is in [.github/docs/give-sms/js](js/README.md).
