[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / OrderSettleData

# Type Alias: OrderSettleData

> **OrderSettleData** = [`CryptoAddressSettleData`](../interfaces/CryptoAddressSettleData.md) \| [`LightningSettleData`](../interfaces/LightningSettleData.md) \| [`TaggedAddressSettleData`](TaggedAddressSettleData.md) \| [`VndBankSettleData`](../interfaces/VndBankSettleData.md) \| [`InternalBalanceSettleData`](../interfaces/InternalBalanceSettleData.md) \| [`CashPickupSettleData`](../interfaces/CashPickupSettleData.md)

Payout object accepted by `POST /api/orders`. Omit it when the method needs no destination.
