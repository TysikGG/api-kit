[**grizzly-sms**](../README.md)

***

[grizzly-sms](../README.md) / ActivationAction

# Variable: ActivationAction

> `const` **ActivationAction**: `object`

Status passed to `setStatus`. Both `-1` and `8` cancel an activation.

## Type Declaration

### Cancel

> `readonly` **Cancel**: `8` = `8`

Cancel the activation.

### CancelAlt

> `readonly` **CancelAlt**: `-1` = `-1`

Alternate cancel code documented alongside `8`.

### Complete

> `readonly` **Complete**: `6` = `6`

Finish the activation.

### Ready

> `readonly` **Ready**: `1` = `1`

Inform the service that an SMS was sent to the number.

### Retry

> `readonly` **Retry**: `3` = `3`

Wait for another code on the same number.
