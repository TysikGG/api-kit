[**peak-client**](../README.md)

***

[peak-client](../README.md) / Cloudflare5sResult

# Interface: Cloudflare5sResult

Result of solving a Cloudflare 5-second challenge.

## Properties

### attributes

> **attributes**: `object`

Form attributes to POST to target URL.

#### md

> **md**: `string`

#### r

> **r**: `string`

***

### cf\_rt

> **cf\_rt**: `string`

Challenge token for the Referer header (`{url}?__cf_chl_tk={cf_rt}`).

***

### cookies

> **cookies**: `Record`\<`string`, `string`\>

Clear clearance cookies to apply to your HTTP session.

***

### headers

> **headers**: `object`

Required headers, including exact user-agent to use.

#### Index Signature

\[`key`: `string`\]: `string` \| `undefined`

#### user-agent?

> `optional` **user-agent?**: `string`
