# grizzly-sms

Клиент [Grizzly SMS](https://grizzlysms.com/docs) для Python. Пользовательское API совместимо с sms-activate: методы активации ходят в `GET https://api.grizzlysms.com/stubs/handler_api.php`. Партнёрский клиент отправляет `PUSH_SMS`, `PUSH_CALL` и `PUSH_CALL_RECORD` на `POST https://api.grizzlysms.com/agent/api/sms`.

Официальная документация: [grizzlysms.com/docs](https://grizzlysms.com/docs) (активация), [партнёрский протокол](https://grizzlysms.com/docs/partner), [кошелёк и справочники](https://grizzlysms.com/docs/utility), [OpenAPI](https://api.grizzlysms.com/docs/client).

Ключ пользователя берётся в настройках профиля на [grizzlysms.com](https://grizzlysms.com). Партнёрский ключ выдаётся в личном кабинете.

Ошибки вроде `NO_NUMBERS` и `BAD_KEY` приходят текстом, обычно с HTTP 200. Клиент бросает `GrizzlySmsError` с полем `code`.

В исходном TypeScript-пакете в `package.json` указана лицензия ISC, файла `LICENSE` не было. Текст лицензии и правообладатель здесь не добавляются.

## Установка

```sh
pip install grizzly-sms
```

Нужен Python 3.10+.

## Пример

```python
import os

from grizzly_sms import GrizzlySms

with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
    balance = sms.get_balance()
    countries = sms.get_countries()
    print(balance, len(countries))
```

Заказ номера (`get_number`, `wait_for_code`, `complete`) списывает деньги и в этот пример не входит. `get_number_v2` принимает те же параметры, что `get_number`, и дополнительно возвращает цену, валюту ISO 4217 и окна `activation_cancel` / `activation_end`.

`GrizzlyPartner` пушит SMS и звонки. `GET_SERVICES`, `GET_NUMBER` и `FINISH_ACTIVATION` приходят на сервер партнёра — этот пакет их не отправляет.
