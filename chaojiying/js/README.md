# chaojiying-client

TypeScript client for the [Chaojiying (超级鹰)](https://www.chaojiying.com) CAPTCHA recognition API.

API Documentation: [https://www.chaojiying.com/api-5.html](https://www.chaojiying.com/api-5.html)

## Features

- **TypeScript-first**: Strict type definitions for parameters, responses, and errors.
- **Image Support**: Supports Node.js `Buffer`, `Uint8Array`, and Base64 strings (with or without data URI prefixes).
- **Secure Authentication**: Automatically generates 32-character lowercase MD5 password hashes (`pass2`).
- **Error Handling**: Custom `ChaojiyingError` containing status codes and Chinese description messages directly from the server.
- **Zero Config**: Automatically picks up `CHAOJIYING_USER` and `CHAOJIYING_PASS` from environment variables.

## Installation

```bash
npm install chaojiying-client
```

## Quick Start

```typescript
import * as fs from "node:fs";
import { Chaojiying } from "chaojiying-client";

const client = new Chaojiying({
  username: process.env.CHAOJIYING_USER,
  password: process.env.CHAOJIYING_PASS,
});

async function main() {
  // Query available balance / points
  const score = await client.getScore();
  console.log(`Available points: ${score.tifen}`);

  // Recognize an image captcha (e.g. 1004 for 4-letter alphanumeric)
  const image = fs.readFileSync("captcha.jpg");
  const result = await client.recognize(image, 1004);
  console.log(`Captcha text: ${result.pic_str}`);

  // If recognition was wrong, report error for a point refund within 3 minutes
  // await client.reportError(result.pic_id);
}

main().catch(console.error);
```

## API Overview

### Account

- `client.getScore()`: Get account remaining points (`tifen`) and locked points (`tifen_lock`).

### CAPTCHA Solving

- `client.recognize(image, codeType, options?)`: Solve a CAPTCHA image and return the recognition result (`pic_str`) and ID (`pic_id`).
- `client.reportError(picId)`: Report an incorrect recognition result to request point refund (valid within 3 minutes of recognition).

## License

ISC
