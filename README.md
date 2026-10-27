# api-kit

[![CI Tests](https://github.com/TysikGG/api-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/TysikGG/api-kit/actions/workflows/ci.yml)
[![CI publish](https://github.com/TysikGG/api-kit/actions/workflows/publish.yml/badge.svg)](https://github.com/TysikGG/api-kit/actions/workflows/publish.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

Monorepo of production-ready, fully typed, independent API client libraries for automation, messaging, and fintech platforms in TypeScript and Python.

Each package is independent and self-contained. The primary source of truth for setup, configuration, and usage examples is the README in each package directory.

---

## Services & Packages

| Service | Description | JavaScript / TypeScript | Python |
| :--- | :--- | :--- | :--- |
| **Grizzly SMS** | Disposable virtual numbers, SMS OTP verification, pricing catalogs, and partner push forwarding | [![npm](https://img.shields.io/npm/v/grizzly-sms.svg?label=npm)](https://www.npmjs.com/package/grizzly-sms)<br>[Documentation & Examples](grizzly-sms/js) | [![PyPI](https://img.shields.io/pypi/v/grizzly-sms-client.svg?label=PyPI)](https://pypi.org/project/grizzly-sms-client/)<br>[Documentation & Examples](grizzly-sms/python) |
| **BitcoinVN** | Vietnam's cryptocurrency exchange & instant swaps: tickers, quotes, orders, balances, and staking | [![npm](https://img.shields.io/npm/v/bitcoinvn.svg?label=npm)](https://www.npmjs.com/package/bitcoinvn)<br>[Documentation & Examples](bitcoinvn/js) | [![PyPI](https://img.shields.io/pypi/v/bitcoinvn.svg?label=PyPI)](https://pypi.org/project/bitcoinvn/)<br>[Documentation & Examples](bitcoinvn/python) |
| **Peak** | Cloudflare Turnstile & 5-second challenge (WAF) CAPTCHA solver | [![npm](https://img.shields.io/npm/v/peak-client.svg?label=npm)](https://www.npmjs.com/package/peak-client)<br>[Documentation & Examples](peak/js) | [![PyPI](https://img.shields.io/pypi/v/peak-client.svg?label=PyPI)](https://pypi.org/project/peak-client/)<br>[Documentation & Examples](peak/python) |
| **YesCaptcha** | Multi-CAPTCHA recognition: reCAPTCHA, hCaptcha, Turnstile, FunCaptcha, AWS WAF | [![npm](https://img.shields.io/npm/v/yescaptcha-client.svg?label=npm)](https://www.npmjs.com/package/yescaptcha-client)<br>[Documentation & Examples](yescaptcha/js) | [![PyPI](https://img.shields.io/pypi/v/yescaptcha-client.svg?label=PyPI)](https://pypi.org/project/yescaptcha-client/)<br>[Documentation & Examples](yescaptcha/python) |
| **SV Number** | Disposable virtual phone numbers & SMS verification API | [![npm](https://img.shields.io/npm/v/sv-number-client.svg?label=npm)](https://www.npmjs.com/package/sv-number-client)<br>[Documentation & Examples](sv-number/js) | [![PyPI](https://img.shields.io/pypi/v/sv-number.svg?label=PyPI)](https://pypi.org/project/sv-number/)<br>[Documentation & Examples](sv-number/python) |
| **SMSBulk** | Virtual phone numbers, disposable email addresses, and OTP verification API | [![npm](https://img.shields.io/npm/v/smsbulk.svg?label=npm)](https://www.npmjs.com/package/smsbulk)<br>[Documentation & Examples](smsbulk/js) | [![PyPI](https://img.shields.io/pypi/v/smsbulk.svg?label=PyPI)](https://pypi.org/project/smsbulk/)<br>[Documentation & Examples](smsbulk/python) |
| **Chaojiying** | Image & coordinate CAPTCHA recognition API (超级鹰) | [![npm](https://img.shields.io/npm/v/chaojiying-client.svg?label=npm)](https://www.npmjs.com/package/chaojiying-client)<br>[Documentation & Examples](chaojiying/js) | [![PyPI](https://img.shields.io/pypi/v/chaojiying.svg?label=PyPI)](https://pypi.org/project/chaojiying/)<br>[Documentation & Examples](chaojiying/python) |
| **Swapzone** | Instant cryptocurrency exchange & DEX cross-chain aggregator API | [![npm](https://img.shields.io/npm/v/swapzone.svg?label=npm)](https://www.npmjs.com/package/swapzone)<br>[Documentation & Examples](swapzone/js) | [![PyPI](https://img.shields.io/pypi/v/swapzone.svg?label=PyPI)](https://pypi.org/project/swapzone/)<br>[Documentation & Examples](swapzone/python) |
| **SimpleSwap** | Instant cryptocurrency exchange API (v3) with customizable fee tiers | [![npm](https://img.shields.io/npm/v/simpleswap-client.svg?label=npm)](https://www.npmjs.com/package/simpleswap-client)<br>[Documentation & Examples](simpleswap/js) | [![PyPI](https://img.shields.io/pypi/v/simpleswap-client.svg?label=PyPI)](https://pypi.org/project/simpleswap-client/)<br>[Documentation & Examples](simpleswap/python) |
| **StealthEX** | Instant non-custodial cryptocurrency exchange API | [![npm](https://img.shields.io/npm/v/stealthex.svg?label=npm)](https://www.npmjs.com/package/stealthex)<br>[Documentation & Examples](stealthex/js) | [![PyPI](https://img.shields.io/pypi/v/stealthex.svg?label=PyPI)](https://pypi.org/project/stealthex/)<br>[Documentation & Examples](stealthex/python) |
| **SMSBower** | Temporary virtual phone numbers & SMS verification API | [![npm](https://img.shields.io/npm/v/smsbower-client.svg?label=npm)](https://www.npmjs.com/package/smsbower-client)<br>[Documentation & Examples](smsbower/js) | [![PyPI](https://img.shields.io/pypi/v/smsbower.svg?label=PyPI)](https://pypi.org/project/smsbower/)<br>[Documentation & Examples](smsbower/python) |
| **VAK-SMS** | Virtual phone numbers and SMS OTP receiving service | [![npm](https://img.shields.io/npm/v/vak-sms.svg?label=npm)](https://www.npmjs.com/package/vak-sms)<br>[Documentation & Examples](vak-sms/js) | [![PyPI](https://img.shields.io/pypi/v/vak-sms.svg?label=PyPI)](https://pypi.org/project/vak-sms/)<br>[Documentation & Examples](vak-sms/python) |
| **SolveCaptcha** | Human and AI CAPTCHA recognition API (reCAPTCHA, Turnstile, Image) | [![npm](https://img.shields.io/npm/v/solvecaptcha.svg?label=npm)](https://www.npmjs.com/package/solvecaptcha)<br>[Documentation & Examples](solvecaptcha/js) | [![PyPI](https://img.shields.io/pypi/v/solvecaptcha.svg?label=PyPI)](https://pypi.org/project/solvecaptcha/)<br>[Documentation & Examples](solvecaptcha/python) |
| **Give-SMS** | Temporary virtual phone numbers and SMS OTP activation API | [![npm](https://img.shields.io/npm/v/give-sms.svg?label=npm)](https://www.npmjs.com/package/give-sms)<br>[Documentation & Examples](give-sms/js) | [![PyPI](https://img.shields.io/pypi/v/give-sms.svg?label=PyPI)](https://pypi.org/project/give-sms/)<br>[Documentation & Examples](give-sms/python) |
| **SideShift** | Instant cross-chain cryptocurrency exchange & DEX aggregator REST API (v2) | [![npm](https://img.shields.io/npm/v/sideshift.svg?label=npm)](https://www.npmjs.com/package/sideshift)<br>[Documentation & Examples](sideshift/js) | [![PyPI](https://img.shields.io/pypi/v/sideshift.svg?label=PyPI)](https://pypi.org/project/sideshift/)<br>[Documentation & Examples](sideshift/python) |
| **2Captcha** | Human-powered and AI CAPTCHA recognition API (reCAPTCHA, Turnstile, hCaptcha) | [![npm](https://img.shields.io/npm/v/2captcha-client.svg?label=npm)](https://www.npmjs.com/package/2captcha-client)<br>[Documentation & Examples](twocaptcha/js) | [![PyPI](https://img.shields.io/pypi/v/2captcha-client.svg?label=PyPI)](https://pypi.org/project/2captcha-client/)<br>[Documentation & Examples](twocaptcha/python) |
| **OnlineSIM** | Disposable and rental virtual phone numbers for SMS OTP receiving API | [![npm](https://img.shields.io/npm/v/onlinesim.svg?label=npm)](https://www.npmjs.com/package/onlinesim)<br>[Documentation & Examples](onlinesim/js) | [![PyPI](https://img.shields.io/pypi/v/onlinesim.svg?label=PyPI)](https://pypi.org/project/onlinesim/)<br>[Documentation & Examples](onlinesim/python) |
| **SMS-MAN** | Global virtual phone numbers and SMS OTP verification API | [![npm](https://img.shields.io/npm/v/sms-man.svg?label=npm)](https://www.npmjs.com/package/sms-man)<br>[Documentation & Examples](sms-man/js) | [![PyPI](https://img.shields.io/pypi/v/sms-man.svg?label=PyPI)](https://pypi.org/project/sms-man/)<br>[Documentation & Examples](sms-man/python) |
| **CapGuru** | AI-powered and human-assisted CAPTCHA solving API | [![npm](https://img.shields.io/npm/v/capguru-client.svg?label=npm)](https://www.npmjs.com/package/capguru-client)<br>[Documentation & Examples](capguru/js) | [![PyPI](https://img.shields.io/pypi/v/capguru-client.svg?label=PyPI)](https://pypi.org/project/capguru-client/)<br>[Documentation & Examples](capguru/python) |
| **FixedFloat** | Automated cryptocurrency exchange & instant swap API v2 | [![npm](https://img.shields.io/npm/v/fixedfloat-client.svg?label=npm)](https://www.npmjs.com/package/fixedfloat-client)<br>[Documentation & Examples](fixedfloat/js) | [![PyPI](https://img.shields.io/pypi/v/fixedfloat-client.svg?label=PyPI)](https://pypi.org/project/fixedfloat-client/)<br>[Documentation & Examples](fixedfloat/python) |
| **XMLStock** | Search engine proxy API: Yandex XML, Yandex Live, Google XML SERP, and Wordstat | [![npm](https://img.shields.io/npm/v/xmlstock.svg?label=npm)](https://www.npmjs.com/package/xmlstock)<br>[Documentation & Examples](xmlstock/js) | [![PyPI](https://img.shields.io/pypi/v/xmlstock.svg?label=PyPI)](https://pypi.org/project/xmlstock/)<br>[Documentation & Examples](xmlstock/python) |

---

## Development

### JavaScript / TypeScript

```bash
cd <service>/js
npm install
npm test          # Run unit test suite (mocked HTTP)
npm run build     # Compile TypeScript to dist/
```

### Python

```bash
cd <service>/python
uv sync
uv run pytest -m "not live"   # Run unit test suite (mocked HTTP)
uv run ruff check .           # Run linter
```

---

## License

All packages in this repository are licensed under the [ISC License](LICENSE).
