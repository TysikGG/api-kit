[**fixedfloat-client**](../README.md)

***

[fixedfloat-client](../README.md) / FixedFloatOptions

# Interface: FixedFloatOptions

Defined in: src/types.ts:4

Options for configuring the FixedFloat client.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: src/types.ts:8

Your FixedFloat API key.

***

### apiSecret?

> `optional` **apiSecret?**: `string`

Defined in: src/types.ts:13

Your FixedFloat API secret used for HMAC-SHA256 signature generation.

***

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: src/types.ts:19

Custom base URL for the FixedFloat API.

#### Default Value

```ts
"https://ff.io/api/v2"
```

***

### timeout?

> `optional` **timeout?**: `number`

Defined in: src/types.ts:25

Request timeout in milliseconds.

#### Default Value

```ts
15000
```
