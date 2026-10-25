[**bitcoinvn**](../README.md)

***

[bitcoinvn](../README.md) / SettleDataCorrection

# Type Alias: SettleDataCorrection

> **SettleDataCorrection** = [`CryptoAddressSettleData`](../interfaces/CryptoAddressSettleData.md) \| [`LightningSettleData`](../interfaces/LightningSettleData.md) \| [`TaggedAddressSettleData`](TaggedAddressSettleData.md) \| [`VndBankSettleData`](../interfaces/VndBankSettleData.md)

Payout object accepted by `PUT /api/orders/{id}/settle-data`.
The spec allows an address, Lightning invoice, tagged address, or VND bank.
