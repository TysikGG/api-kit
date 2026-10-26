[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / PartnerFinishActivationRequest

# Interface: PartnerFinishActivationRequest

Inbound `FINISH_ACTIVATION` body.
`1` forbidden, `3` sold, `4` cancelled, `5` returned to the customer.

## Properties

### action

> **action**: `"FINISH_ACTIVATION"`

***

### activationId

> **activationId**: `number`

***

### key

> **key**: `string`

***

### status

> **status**: `1` \| `3` \| `4` \| `5`
