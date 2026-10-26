[**solvecaptcha-client**](../README.md)

***

[solvecaptcha-client](../README.md) / ImageCaptchaOptions

# Interface: ImageCaptchaOptions

Defined in: src/index.ts:41

Options for solving a normal image captcha.

## Properties

### body

> **body**: `string`

Defined in: src/index.ts:45

Base64 encoded image string.

***

### calc?

> `optional` **calc?**: `0` \| `1`

Defined in: src/index.ts:61

0 = no math, 1 = requires calculation.

***

### language?

> `optional` **language?**: `0` \| `1` \| `2`

Defined in: src/index.ts:73

0 = not specified, 1 = Cyrillic, 2 = Latin.

***

### maxLen?

> `optional` **maxLen?**: `number`

Defined in: src/index.ts:69

Maximum number of characters.

***

### minLen?

> `optional` **minLen?**: `number`

Defined in: src/index.ts:65

Minimum number of characters.

***

### numeric?

> `optional` **numeric?**: `0` \| `1` \| `2` \| `3` \| `4`

Defined in: src/index.ts:57

0 = not specified, 1 = only numbers, 2 = only letters, 3 = only numbers OR only letters, 4 = both numbers and letters.

***

### phrase?

> `optional` **phrase?**: `0` \| `1`

Defined in: src/index.ts:49

0 = single word, 1 = two or more words.

***

### regsense?

> `optional` **regsense?**: `0` \| `1`

Defined in: src/index.ts:53

0 = case insensitive, 1 = case sensitive.

***

### textinstructions?

> `optional` **textinstructions?**: `string`

Defined in: src/index.ts:77

Optional text instructions for the worker.
