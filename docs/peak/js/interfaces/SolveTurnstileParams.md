[**peak-client**](../README.md)

***

[peak-client](../README.md) / SolveTurnstileParams

# Interface: SolveTurnstileParams

Parameters for solving a Cloudflare Turnstile challenge.

## Properties

### action?

> `optional` **action?**: `string`

Turnstile action value, if configured on the target site.

***

### cdata?

> `optional` **cdata?**: `string`

Turnstile cdata value, if configured on the target site.

***

### proxy?

> `optional` **proxy?**: `string`

Proxy in `http://user:pass@ip:port` format.
If omitted, proxyless mode (`TurnstileTaskProxyLess`) will be used.

***

### sitekey

> **sitekey**: `string`

Cloudflare Turnstile sitekey.

***

### url

> **url**: `string`

Target page URL (recommended with trailing slash).
