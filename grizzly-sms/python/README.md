# 🐻 grizzly-sms

Python-клиент [Grizzly SMS](https://grizzlysms.com/docs). Номера, коды, цены и партнёрские пуши.

```sh
pip install grizzly-sms
```

Python 3.10+. Ключ из профиля на [grizzlysms.com](https://grizzlysms.com), переменная `GRIZZLY_API_KEY`.

```python
import os

from grizzly_sms import GrizzlySms

with GrizzlySms(os.environ["GRIZZLY_API_KEY"]) as sms:
    print(sms.get_balance(), len(sms.get_countries()))
```

Пример только читает баланс и список стран. Заказ номера списывает деньги.

[Активация](https://grizzlysms.com/docs) · [Партнёры](https://grizzlysms.com/docs/partner) · [Справочники](https://grizzlysms.com/docs/utility)
