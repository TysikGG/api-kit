# GrizzlySMS — JavaScript

Клиент `grizzly-sms` вызывает [активационное API Grizzly SMS](https://grizzlysms.com/docs). Ключ пользователя копируется из настроек профиля на [grizzlysms.com](https://grizzlysms.com). Партнёрский ключ лежит в личном кабинете и нужен только для `GrizzlyPartner`.

```sh
npm i grizzly-sms
```

Проверка без покупки номера:

```ts
import { GrizzlySms } from "grizzly-sms";

const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
});

const balance = await sms.getBalance();
const countries = await sms.getCountries();
console.log(balance, countries.length);
```

Исходник: `grizzly-sms/js/examples/check.ts`.

`GrizzlyPartner` пушит входящие SMS и звонки. Этот вызов меняет состояние на стороне Grizzly и в пример проверки не входит.

`GET_SERVICES`, `GET_NUMBER` и `FINISH_ACTIVATION` приходят на ваш сервер. Для них в пакете есть типы запроса и ответа. Описание протокола: [grizzlysms.com/docs/partner](https://grizzlysms.com/docs/partner).

Справочник методов генерируется в [docs/grizzly-sms/js](grizzly-sms/js/README.md).
