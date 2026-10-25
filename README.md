# api-kit

[![CI publish](https://github.com/TysikGG/api-kit/actions/workflows/publish.yml/badge.svg)](https://github.com/TysikGG/api-kit/actions/workflows/publish.yml)
[![Documentation](https://github.com/TysikGG/api-kit/actions/workflows/pages.yml/badge.svg)](https://tysikgg.github.io/api-kit/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

Monorepo of production-ready, fully typed, independent API client libraries for automation, messaging, and fintech platforms in TypeScript and Python.

---

## Services & Packages

| Service | Description | JavaScript / TypeScript | Python |
| :--- | :--- | :--- | :--- |
| **Grizzly SMS** | Disposable virtual numbers, SMS OTP verification, pricing catalogs, and partner push forwarding | [![npm](https://img.shields.io/npm/v/grizzly-sms.svg?label=npm)](https://www.npmjs.com/package/grizzly-sms)<br>[Documentation & Examples](grizzly-sms/js) | [![PyPI](https://img.shields.io/pypi/v/grizzly-sms-client.svg?label=PyPI)](https://pypi.org/project/grizzly-sms-client/)<br>[Documentation & Examples](grizzly-sms/python) |
| **BitcoinVN** | Vietnam's cryptocurrency exchange & instant swaps: tickers, quotes, orders, balances, and staking | [![npm](https://img.shields.io/npm/v/bitcoinvn.svg?label=npm)](https://www.npmjs.com/package/bitcoinvn)<br>[Documentation & Examples](bitcoinvn/js) | [![PyPI](https://img.shields.io/pypi/v/bitcoinvn.svg?label=PyPI)](https://pypi.org/project/bitcoinvn/)<br>[Documentation & Examples](bitcoinvn/python) |
| **Peak** | Cloudflare Turnstile & 5-second challenge (WAF) CAPTCHA solver | [![npm](https://img.shields.io/npm/v/peak-client.svg?label=npm)](https://www.npmjs.com/package/peak-client)<br>[Documentation & Examples](peak/js) | [![PyPI](https://img.shields.io/pypi/v/peak-client.svg?label=PyPI)](https://pypi.org/project/peak-client/)<br>[Documentation & Examples](peak/python) |
| **YesCaptcha** | Multi-CAPTCHA recognition: reCAPTCHA, hCaptcha, Turnstile, FunCaptcha, AWS WAF | [![npm](https://img.shields.io/npm/v/yescaptcha-client.svg?label=npm)](https://www.npmjs.com/package/yescaptcha-client)<br>[Documentation & Examples](yescaptcha/js) | [![PyPI](https://img.shields.io/pypi/v/yescaptcha-client.svg?label=PyPI)](https://pypi.org/project/yescaptcha-client/)<br>[Documentation & Examples](yescaptcha/python) |
| **SV Number** | Disposable virtual phone numbers & SMS verification API | [![npm](https://img.shields.io/npm/v/sv-number.svg?label=npm)](https://www.npmjs.com/package/sv-number)<br>[Documentation & Examples](sv-number/js) | [![PyPI](https://img.shields.io/pypi/v/sv-number.svg?label=PyPI)](https://pypi.org/project/sv-number/)<br>[Documentation & Examples](sv-number/python) |
| **SMSBulk** | Virtual phone numbers, disposable email addresses, and OTP verification API | [![npm](https://img.shields.io/npm/v/smsbulk-client.svg?label=npm)](https://www.npmjs.com/package/smsbulk-client)<br>[Documentation & Examples](smsbulk/js) | [![PyPI](https://img.shields.io/pypi/v/smsbulk-client.svg?label=PyPI)](https://pypi.org/project/smsbulk-client/)<br>[Documentation & Examples](smsbulk/python) |
| **Chaojiying** | Image & coordinate CAPTCHA recognition API (超级鹰) | [![npm](https://img.shields.io/npm/v/chaojiying-client.svg?label=npm)](https://www.npmjs.com/package/chaojiying-client)<br>[Documentation & Examples](chaojiying/js) | [![PyPI](https://img.shields.io/pypi/v/chaojiying-client.svg?label=PyPI)](https://pypi.org/project/chaojiying-client/)<br>[Documentation & Examples](chaojiying/python) |

---

## Documentation

Full interactive documentation, guides, and auto-generated API references are hosted on GitHub Pages:

🔗 **[https://tysikgg.github.io/api-kit/](https://tysikgg.github.io/api-kit/)**

---

## Development

### JavaScript / TypeScript

```bash
cd <service>/js
npm install
npm test          # Run unit test suite (mocked HTTP)
npm run build     # Compile TypeScript to dist/
npm run docs      # Regenerate TypeDoc markdown reference
```

### Python

```bash
cd <service>/python
uv sync
uv run pytest -m "not live"   # Run unit test suite (mocked HTTP)
uv run ruff check .           # Run linter
uv run pydoc-markdown         # Regenerate reference documentation
```

---

## License

All packages in this repository are licensed under the [ISC License](LICENSE).
