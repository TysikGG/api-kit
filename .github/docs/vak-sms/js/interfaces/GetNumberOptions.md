[**vak-sms-client**](../README.md)

***

[vak-sms-client](../README.md) / GetNumberOptions

# Interface: GetNumberOptions

Defined in: [src/index.ts:33](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L33)

Options for requesting a virtual phone number.

## Properties

### country?

> `optional` **country?**: `string`

Defined in: [src/index.ts:41](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L41)

Country code (e.g. 'ru', 'kz', 'ua').

***

### operator?

> `optional` **operator?**: `string`

Defined in: [src/index.ts:45](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L45)

Mobile operator name (e.g. 'megafon', 'beeline', 'tele2').

***

### rent?

> `optional` **rent?**: `boolean`

Defined in: [src/index.ts:49](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L49)

Whether to order a prolonged rental number (e.g. 4 hours).

***

### service

> **service**: `string` \| `string`[]

Defined in: [src/index.ts:37](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L37)

Service code (e.g. 'tg' for Telegram, 'wa' for WhatsApp) or an array of two codes.

***

### softId?

> `optional` **softId?**: `string`

Defined in: [src/index.ts:53](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/vak-sms/js/src/index.ts#L53)

Optional partner/software ID override.
