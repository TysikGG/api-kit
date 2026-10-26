[**swapzone-client**](../README.md)

***

[swapzone-client](../README.md) / GetRateParams

# Interface: GetRateParams

Parameters for querying exchange rates.

## Properties

### amount

> **amount**: `string` \| `number`

Exchange deposit amount

***

### amountTo?

> `optional` **amountTo?**: `string` \| `number`

Amount to receive after exchange (for reverse rate)

***

### availableInUSA?

> `optional` **availableInUSA?**: `boolean`

Filter for partners that work with USA clients

***

### chooseRate?

> `optional` **chooseRate?**: `"all"` \| `"best"` \| `"recommended"`

Selection strategy: 'best', 'all', or 'recommended' (default: 'best')

***

### from

> **from**: `string`

Ticker of the deposited currency (e.g. 'btc')

***

### fromNetwork?

> `optional` **fromNetwork?**: `string`

Network of the deposit currency

***

### noRefundAddress?

> `optional` **noRefundAddress?**: `boolean`

Exchangers with optional return address

***

### rateType?

> `optional` **rateType?**: `"all"` \| `"fixed"` \| `"floating"`

Rate type: 'all', 'fixed', or 'floating' (default: 'all')

***

### timeout?

> `optional` **timeout?**: `string` \| `number`

Timeout in ms to limit exchanger response time

***

### to

> **to**: `string`

Ticker of the received currency (e.g. 'eth')

***

### toNetwork?

> `optional` **toNetwork?**: `string`

Network of the received currency
