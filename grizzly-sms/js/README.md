# grizzly-sms

Клиент [Grizzly SMS](https://grizzlysms.com/docs) для Node.js. Пользовательское API совместимо с sms-activate: методы активации ходят в `GET https://api.grizzlysms.com/stubs/handler_api.php`. Партнёрский клиент отправляет `PUSH_SMS`, `PUSH_CALL` и `PUSH_CALL_RECORD` на `POST https://api.grizzlysms.com/agent/api/sms`.

Официальная документация: [grizzlysms.com/docs](https://grizzlysms.com/docs) (активация), [партнёрский протокол](https://grizzlysms.com/docs/partner), [кошелёк и справочники](https://grizzlysms.com/docs/utility), [OpenAPI](https://api.grizzlysms.com/docs/client).

Ключ пользователя берётся в настройках профиля на [grizzlysms.com](https://grizzlysms.com). Партнёрский ключ выдаётся в личном кабинете.

Ошибки вроде `NO_NUMBERS` и `BAD_KEY` приходят текстом, обычно с HTTP 200. Клиент бросает `GrizzlySmsError` с полем `code`.

В исходном пакете в `package.json` указана лицензия ISC, файла `LICENSE` не было. Текст лицензии и правообладатель здесь не добавляются.

## Установка

```sh
npm i grizzly-sms
```

Нужен Node.js 18+.

## Пример

```js
const { GrizzlySms } = require("grizzly-sms");

const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY,
});

const balance = await sms.getBalance();
const countries = await sms.getCountries();
console.log(balance, countries.length);
```

Заказ номера (`getNumber`, `waitForCode`, `complete`) списывает деньги и в этот пример не входит. `getNumberV2` принимает те же параметры, что `getNumber`, и дополнительно возвращает цену, валюту ISO 4217 и окна `activationCancel` / `activationEnd`.

`GrizzlyPartner` пушит SMS и звонки. `GET_SERVICES`, `GET_NUMBER` и `FINISH_ACTIVATION` приходят на сервер партнёра — для них экспортируются типы запросов и ответов.
