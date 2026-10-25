[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / flattenPrices

# Function: flattenPrices()

> **flattenPrices**(`data`): [`PriceQuote`](../interfaces/PriceQuote.md)[]

Flatten a `getPrices` table into rows. Non-numeric cost or count is skipped.

## Parameters

### data

[`PricesByCountry`](../type-aliases/PricesByCountry.md)

## Returns

[`PriceQuote`](../interfaces/PriceQuote.md)[]

## Example

```ts
const quotes = flattenPrices({ "16": { tg: { cost: 0.4, count: 20 } } });
```
