# GrizzlySMS — Python

Клиент `grizzly-sms` вызывает [активационное API Grizzly SMS](https://grizzlysms.com/docs). Ключ пользователя копируется из настроек профиля на [grizzlysms.com](https://grizzlysms.com) и передаётся в `GRIZZLY_API_KEY`. Партнёрский ключ (`GRIZZLY_PARTNER_KEY`) нужен только для `GrizzlyPartner`.

```sh
pip install grizzly-sms
```

Проверка без покупки номера:

```python
import os

from grizzly_sms import GrizzlySms


def main() -> None:
    with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
        balance = sms.get_balance()
        countries = sms.get_countries()
        print(balance, len(countries))


if __name__ == "__main__":
    main()
```

Исходник: `grizzly-sms/python/examples/check.py`.

`GrizzlyPartner` пушит входящие SMS и звонки. Этот вызов меняет состояние на стороне Grizzly и в пример проверки не входит.

`GET_SERVICES`, `GET_NUMBER` и `FINISH_ACTIVATION` приходят на сервер партнёра. Этот пакет их не отправляет. Описание протокола: [grizzlysms.com/docs/partner](https://grizzlysms.com/docs/partner).

Справочник методов генерируется в [docs/grizzly-sms/python/grizzly_sms.md](grizzly-sms/python/grizzly_sms.md).
