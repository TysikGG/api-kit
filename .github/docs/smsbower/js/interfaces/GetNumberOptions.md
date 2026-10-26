[**smsbower-client**](../README.md)

***

[smsbower-client](../README.md) / GetNumberOptions

# Interface: GetNumberOptions

Defined in: [src/index.ts:29](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L29)

Options for ordering a virtual phone number.

## Properties

### country?

> `optional` **country?**: `string` \| `number`

Defined in: [src/index.ts:37](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L37)

Country ID or code (e.g. '22' for India, '1003' for Bermuda).

***

### exceptProviderIds?

> `optional` **exceptProviderIds?**: `string` \| `number`[]

Defined in: [src/index.ts:53](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L53)

Blacklist provider IDs (comma-separated string or array of IDs).

***

### maxPrice?

> `optional` **maxPrice?**: `number`

Defined in: [src/index.ts:41](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L41)

Maximum acceptable price for purchasing the number.

***

### minPrice?

> `optional` **minPrice?**: `number`

Defined in: [src/index.ts:45](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L45)

Minimum acceptable price for purchasing the number.

***

### phoneException?

> `optional` **phoneException?**: `string`

Defined in: [src/index.ts:57](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L57)

Excluded number prefix masks (e.g. '7918,7900111').

***

### providerIds?

> `optional` **providerIds?**: `string` \| `number`[]

Defined in: [src/index.ts:49](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L49)

Whitelist provider IDs (comma-separated string or array of IDs).

***

### service

> **service**: `string`

Defined in: [src/index.ts:33](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L33)

Service code (e.g. 'tg' for Telegram, 'wa' for WhatsApp).

***

### userID?

> `optional` **userID?**: `string` \| `number`

Defined in: [src/index.ts:61](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/smsbower/js/src/index.ts#L61)

Reseller user identifier.
