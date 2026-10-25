[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / GrizzlyPartner

# Class: GrizzlyPartner

Client for the calls a partner sends to Grizzly: SMS, flash-call, and
call-record delivery. `GET_SERVICES`, `GET_NUMBER`, and `FINISH_ACTIVATION`
are incoming requests — the types above describe those payloads.

PUSH_CALL and PUSH_CALL_RECORD are posted to `/agent/api/sms`, the address
written in the protocol articles. The `action` field selects the method.

## Example

```ts
const partner = new GrizzlyPartner({ key: process.env.GRIZZLY_PARTNER_KEY! });
await partner.pushSms({
  smsId: 1,
  phone: 447472190082,
  phoneFrom: "Microsoft",
  text: "code 5015",
});
```

## Constructors

### Constructor

> **new GrizzlyPartner**(`options`): `GrizzlyPartner`

#### Parameters

##### options

[`GrizzlyPartnerOptions`](../interfaces/GrizzlyPartnerOptions.md)

Partner key from the personal account.

#### Returns

`GrizzlyPartner`

#### Example

```ts
const partner = new GrizzlyPartner({ key: process.env.GRIZZLY_PARTNER_KEY! });
```

## Methods

### pushCall()

> **pushCall**(`params`): `Promise`\<[`PartnerStatus`](../interfaces/PartnerStatus.md)\>

Deliver a flash-call (`PUSH_CALL`).

#### Parameters

##### params

[`PushCallParams`](../interfaces/PushCallParams.md)

#### Returns

`Promise`\<[`PartnerStatus`](../interfaces/PartnerStatus.md)\>

#### Example

```ts
await partner.pushCall({
  callId: 10,
  phone: 447472190082,
  phoneFrom: "100",
});
```

***

### pushCallRecord()

> **pushCallRecord**(`params`): `Promise`\<[`PartnerStatus`](../interfaces/PartnerStatus.md)\>

Deliver a call recording (`PUSH_CALL_RECORD`). Pass `text`, `file`, or both.

#### Parameters

##### params

[`PushCallRecordParams`](../interfaces/PushCallRecordParams.md)

#### Returns

`Promise`\<[`PartnerStatus`](../interfaces/PartnerStatus.md)\>

#### Example

```ts
await partner.pushCallRecord({
  callId: 10,
  phone: 447472190082,
  phoneFrom: "100",
  text: "your code is 5015",
});
```

***

### pushSms()

> **pushSms**(`params`): `Promise`\<[`PartnerStatus`](../interfaces/PartnerStatus.md)\>

Deliver an inbound SMS (`PUSH_SMS`).

#### Parameters

##### params

[`PushSmsParams`](../interfaces/PushSmsParams.md)

#### Returns

`Promise`\<[`PartnerStatus`](../interfaces/PartnerStatus.md)\>

#### Example

```ts
await partner.pushSms({
  smsId: 1,
  phone: 447472190082,
  phoneFrom: "Microsoft",
  text: "code 5015",
});
```
