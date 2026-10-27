# xmlstock

Production-grade TypeScript and JavaScript client for the [XMLStock](https://xmlstock.com) search engine proxy API. Provides high-throughput, structured access to Yandex XML Proxy, Yandex Live, Google XML Search, and Yandex Wordstat statistics.

[![npm version](https://img.shields.io/npm/v/xmlstock.svg)](https://www.npmjs.com/package/xmlstock)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **Yandex XML Proxy**: Perform automated search queries via official Yandex XML infrastructure.
- **Yandex Live**: Real-time SERP parsing for dynamic desktop and mobile positions.
- **Google XML Search**: Direct SERP extraction for Google with localization and country filtering.
- **Yandex Wordstat**: Keyword frequency, seasonal dynamics, and regional search volumes.
- **Balance & Limits**: Free account checks for funds, active packages, and remaining limits.
- **TypeScript Support**: Full typing with comprehensive TSDoc documentation for all parameters and methods.

---

## Installation

```bash
npm install xmlstock
```

---

## Quick Start

```typescript
import { XmlStockClient } from 'xmlstock';

const client = new XmlStockClient({
  user: process.env.XMLSTOCK_USER || '12345',
  apiKey: process.env.XMLSTOCK_KEY || 'your_api_key',
});

// Check balance and remaining daily limits (free call)
const account = await client.getBalance();
console.log('Account balance:', account);
```

---

## Configuration

| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `user` | `string \| number` | Yes | Your XMLStock User ID from dashboard profile. |
| `apiKey` | `string` | Yes | Your secret API access key from dashboard. |
| `baseUrl` | `string` | No | API endpoint base URL. Defaults to `https://xmlstock.com`. |
| `timeout` | `number` | No | Request timeout in milliseconds. Defaults to `30000` (30 seconds). |

---

## API Reference

### `getBalance()`

Retrieves current account balance, currency, remaining limits, and active tariff plans. This call is free and does not spend search limits.

```typescript
const balance = await client.getBalance();
console.log('Balance:', balance);
```

### `searchYandex(query, options?)`

Queries Yandex search results via Yandex XML Proxy.

```typescript
const xml = await client.searchYandex('buy laptop', {
  lr: 213,           // Region: 213 = Moscow, 225 = Russia
  groupby: 10,       // Results per page (up to 100)
  page: 0,           // Page index (starts at 0)
  domain: 'ru',      // Domain zone
  filter: 'moderate',// 'none' | 'moderate' | 'strict'
  device: 'desktop', // 'desktop' | 'mobile'
});
console.log('XML Results:', xml);
```

### `searchYandexLive(query, options?)`

Queries real-time live search results from Yandex.

```typescript
const xml = await client.searchYandexLive('flights to paris', {
  lr: 213,
  device: 'mobile',
});
```

### `searchGoogle(query, options?)`

Queries Google search results with country and language controls.

```typescript
const xml = await client.searchGoogle('best developer tools', {
  domain: 'com',
  country: 'us',
  hl: 'en',
  safe: 'off',
});
```

### `getWordstat(words, options?)`

Retrieves keyword search volumes and related queries from Yandex Wordstat.

```typescript
const stats = await client.getWordstat(['seo automation', 'serp tracker'], {
  pagetype: 'words', // 'words' | 'regions' | 'dynamics'
});
console.log('Wordstat data:', stats);
```

---

## Error Handling

All client methods throw `XmlStockError` when an API error or network failure occurs.

```typescript
import { XmlStockClient, XmlStockError } from 'xmlstock';

try {
  const result = await client.searchGoogle('query');
} catch (error) {
  if (error instanceof XmlStockError) {
    console.error(`XMLStock Error [${error.code}]:`, error.message);
    console.error('HTTP Status:', error.status);
    console.error('Response Data:', error.responseData);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## License

MIT
