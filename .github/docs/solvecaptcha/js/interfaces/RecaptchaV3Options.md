[**solvecaptcha-client**](../README.md)

***

[solvecaptcha-client](../README.md) / RecaptchaV3Options

# Interface: RecaptchaV3Options

Defined in: [src/index.ts:115](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L115)

Options for solving Google reCAPTCHA V3.

## Properties

### action?

> `optional` **action?**: `string`

Defined in: [src/index.ts:127](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L127)

Action parameter value.

***

### googlekey

> **googlekey**: `string`

Defined in: [src/index.ts:119](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L119)

Sitekey found in target page HTML.

***

### minScore?

> `optional` **minScore?**: `number`

Defined in: [src/index.ts:131](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L131)

Minimum required score (e.g. 0.3, 0.7, 0.9).

***

### pageurl

> **pageurl**: `string`

Defined in: [src/index.ts:123](https://github.com/TysikGG/api-kit/blob/7f609a5c7b7a73525761081e4a5b7ec96857a509/solvecaptcha/js/src/index.ts#L123)

Full URL of the page containing the reCAPTCHA.
