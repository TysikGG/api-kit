# Grizzly SMS — Python

The `grizzly-sms` client calls the [Grizzly SMS activation API](https://grizzlysms.com/docs). Copy the user key from the profile on [grizzlysms.com](https://grizzlysms.com) into `GRIZZLY_API_KEY`. The partner key (`GRIZZLY_PARTNER_KEY`) is only needed for `GrizzlyPartner`.

```sh
pip install grizzly-sms-client
```

Check the client without buying a number:

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

Source: `grizzly-sms/python/examples/check.py`.

`GrizzlyPartner` pushes inbound SMS and calls. That call changes state on Grizzly's side and is not part of the check example.

`GET_SERVICES`, `GET_NUMBER`, and `FINISH_ACTIVATION` arrive on the partner server. This package does not send them. Protocol: [grizzlysms.com/docs/partner](https://grizzlysms.com/docs/partner).

The generated method reference is in [docs/grizzly-sms/python/grizzly_sms.md](grizzly-sms/python/grizzly_sms.md).
