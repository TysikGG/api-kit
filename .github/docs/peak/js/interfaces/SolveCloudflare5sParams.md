[**peak-client**](../README.md)

***

[peak-client](../README.md) / SolveCloudflare5sParams

# Interface: SolveCloudflare5sParams

Parameters for solving a Cloudflare 5-second challenge (WAF / Under Attack mode).

## Properties

### html?

> `optional` **html?**: `string`

Optional pre-fetched HTML to skip initial fetch.

***

### proxy

> **proxy**: `string`

Sticky proxy in `http://user:pass@ip:port` format.

***

### url

> **url**: `string`

Target page URL (must end with a trailing slash `/`).

***

### userAgent?

> `optional` **userAgent?**: `string`

Windows Chrome user-agent string.
