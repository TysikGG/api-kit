[**fixedfloat-client**](../README.md)

***

[fixedfloat-client](../README.md) / ApiResponse

# Interface: ApiResponse\<T\>

Defined in: src/types.ts:31

Standard API response wrapper from FixedFloat v2.

## Type Parameters

### T

`T`

## Properties

### code

> **code**: `number`

Defined in: src/types.ts:35

Status code: 0 indicates success.

***

### data

> **data**: `T`

Defined in: src/types.ts:45

Response payload.

***

### msg

> **msg**: `string`

Defined in: src/types.ts:40

Status or error message ("OK", "success", etc.).
