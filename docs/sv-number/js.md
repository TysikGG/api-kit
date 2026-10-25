# SV Number — JavaScript

The `sv-number` library calls the [SV Number SMS Verification API](https://sms-verification-number.com/en/api-sms-activate/).

```sh
npm i sv-number
```

Check the client without renting numbers:

```ts
import { SvNumber } from "sv-number";

const client = new SvNumber({
  apiKey: process.env.SV_NUMBER_API_KEY!,
});

const balance = await client.getBalance();
console.log("SV Number balance:", balance);
```

Source: `sv-number/js/examples/check.ts`.

The generated method reference is in [docs/sv-number/js](js/README.md).
