# SMS-MAN — JavaScript

The `sms-man` package provides a TypeScript/JavaScript client for the [SMS-MAN API](https://sms-man.com/site/api).

```sh
npm i sms-man
```

## Quick Check

Check account balance and browse supported countries:

```ts
import { SmsMan } from 'sms-man';

const client = new SmsMan({
  token: process.env.SMSMAN_API_KEY!,
});

const balance = await client.getBalance();
console.log(`Balance: ${balance}`);

const countries = await client.getCountries();
console.log('Supported countries:', countries);
```

Source: `sms-man/js/examples/check.ts`.

The generated method reference is in [.github/docs/sms-man/js](js/README.md).
