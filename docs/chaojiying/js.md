# Chaojiying — JavaScript

The `chaojiying-client` package provides a TypeScript/JavaScript client for the [Chaojiying (超级鹰)](https://www.chaojiying.com/api-5.html) CAPTCHA recognition API.

```sh
npm i chaojiying-client
```

## Quick Check

Check account balance (remaining points) without submitting any CAPTCHAs:

```ts
import { Chaojiying } from "chaojiying-client";

const client = new Chaojiying({
  username: process.env.CHAOJIYING_USER!,
  password: process.env.CHAOJIYING_PASS!,
});

const score = await client.getScore();
console.log(`Current points: ${score.tifen}`);
```

Source: `chaojiying/js/examples/quickstart.ts`.

The generated method reference is in [docs/chaojiying/js](js/README.md).
