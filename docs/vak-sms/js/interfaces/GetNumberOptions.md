[**vak-sms-client**](../README.md)

***

[vak-sms-client](../README.md) / GetNumberOptions

# Interface: GetNumberOptions

Defined in: src/index.ts:33

Options for requesting a virtual phone number.

## Properties

### country?

> `optional` **country?**: `string`

Defined in: src/index.ts:41

Country code (e.g. 'ru', 'kz', 'ua').

***

### operator?

> `optional` **operator?**: `string`

Defined in: src/index.ts:45

Mobile operator name (e.g. 'megafon', 'beeline', 'tele2').

***

### rent?

> `optional` **rent?**: `boolean`

Defined in: src/index.ts:49

Whether to order a prolonged rental number (e.g. 4 hours).

***

### service

> **service**: `string` \| `string`[]

Defined in: src/index.ts:37

Service code (e.g. 'tg' for Telegram, 'wa' for WhatsApp) or an array of two codes.

***

### softId?

> `optional` **softId?**: `string`

Defined in: src/index.ts:53

Optional partner/software ID override.
