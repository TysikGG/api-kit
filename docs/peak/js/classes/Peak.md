[**peak-client**](../README.md)

***

[peak-client](../README.md) / Peak

# Class: Peak

Client for the Peak CAPTCHA solving API (Cloudflare Turnstile and 5-second challenge).

## Example

```ts
const client = new Peak({ apiKey: "pk_..." });
const balance = await client.getBalance();
```

## Constructors

### Constructor

> **new Peak**(`options`): `Peak`

#### Parameters

##### options

`string` \| [`PeakOptions`](../interfaces/PeakOptions.md)

Client configuration or API key string.

#### Returns

`Peak`

## Methods

### getBalance()

> **getBalance**(): `Promise`\<[`BalanceData`](../type-aliases/BalanceData.md)\>

Retrieve current account balance or package subscription status.

#### Returns

`Promise`\<[`BalanceData`](../type-aliases/BalanceData.md)\>

#### Example

```ts
const balance = await client.getBalance();
if (balance.type === "pay_per_solve") {
  console.log(`Balance: $${balance.balance}`);
}
```

***

### solve()

> **solve**\<`T`\>(`task`): `Promise`\<`T`\>

Send a raw solve request with any task payload.
Automatically embeds the application identifier.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### task

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`T`\>

***

### solveCloudflare5s()

> **solveCloudflare5s**(`params`): `Promise`\<[`Cloudflare5sResult`](../interfaces/Cloudflare5sResult.md)\>

Solve Cloudflare 5-second challenge (WAF / Under Attack Mode).

#### Parameters

##### params

[`SolveCloudflare5sParams`](../interfaces/SolveCloudflare5sParams.md)

#### Returns

`Promise`\<[`Cloudflare5sResult`](../interfaces/Cloudflare5sResult.md)\>

#### Example

```ts
const result = await client.solveCloudflare5s({
  url: "https://example.com/",
  proxy: "http://user:pass@1.2.3.4:8080",
});
```

***

### solveTurnstile()

> **solveTurnstile**(`params`): `Promise`\<[`TurnstileResult`](../interfaces/TurnstileResult.md)\>

Solve Cloudflare Turnstile challenge.

Automatically uses `TurnstileTaskProxyLess` when `proxy` is omitted,
or `turnstiletask` when a proxy is provided.

#### Parameters

##### params

[`SolveTurnstileParams`](../interfaces/SolveTurnstileParams.md)

#### Returns

`Promise`\<[`TurnstileResult`](../interfaces/TurnstileResult.md)\>

#### Example

```ts
const { token } = await client.solveTurnstile({
  url: "https://example.com/",
  sitekey: "0x4AAAAAAA...",
});
```
