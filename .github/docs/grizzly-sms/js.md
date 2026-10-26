# Grizzly SMS — JavaScript

The `grizzly-sms` client calls the [Grizzly SMS activation API](https://grizzlysms.com/docs). Copy the user key from the profile on [grizzlysms.com](https://grizzlysms.com). The partner key lives in the account and is only needed for `GrizzlyPartner`.

```sh
npm i grizzly-sms
```

Check the client without buying a number:

```ts
import { GrizzlySms } from "grizzly-sms";

const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
});

const balance = await sms.getBalance();
const countries = await sms.getCountries();
console.log(balance, countries.length);
```

Source: `grizzly-sms/js/examples/check.ts`.

`GrizzlyPartner` pushes inbound SMS and calls. That call changes state on Grizzly's side and is not part of the check example.

`GET_SERVICES`, `GET_NUMBER`, and `FINISH_ACTIVATION` arrive on your server. The package exports request and response types for them. Protocol: [grizzlysms.com/docs/partner](https://grizzlysms.com/docs/partner).

The generated method reference is in [.github/docs/grizzly-sms/js](grizzly-sms/js/README.md).
