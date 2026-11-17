# greedy-sms

TypeScript / JavaScript client library for the [Greedy SMS](https://api.greedy-sms.com/docs) activation, rental, and disposable email API.

## Features

- Full coverage of modern Greedy SMS REST API endpoints
- Strongly typed request parameters and responses
- Structured error classes (`AuthenticationError`, `RateLimitError`, `ValidationError`, `NotFoundError`, etc.)
- Virtual phone activations, long-term rentals, and disposable email verification
- Legacy SMS-Activate protocol compatibility via `handlerApi`

## Installation

```bash
npm install greedy-sms
```

## Quick Start

```typescript
import { GreedySMS } from "greedy-sms";

const client = new GreedySMS({
  apiKey: process.env.GREEDY_SMS_API_KEY!,
});

// Check account balance and profile
const me = await client.getMe();
console.log(`Balance: ${me.balance} RUB`);

// List available countries
const { countries } = await client.getCountries({ page: 1, pageSize: 5 });
for (const country of countries) {
  console.log(`[${country.id}] ${country.title.eng}`);
}
```

## SMS Activation Workflow

```typescript
import { GreedySMS } from "greedy-sms";

const client = new GreedySMS({ apiKey: "your-api-key" });

// 1. Order a number for Telegram in Kazakhstan (country: 2)
const order = await client.getNumber({
  service: "tg",
  country: 2,
});
console.log(`Phone: ${order.phone}, Activation ID: ${order.activationId}`);

// 2. Poll for incoming SMS status
const status = await client.getStatus(order.activationId);
if (status.status.startsWith("STATUS_OK:")) {
  const code = status.status.split(":")[1];
  console.log(`Received SMS code: ${code}`);

  // 3. Mark activation as completed
  await client.finishActivation(order.activationId);
} else if (status.status === "STATUS_WAIT_CODE") {
  console.log("Waiting for incoming SMS...");
}
```

## API Reference

### Client Configuration

```typescript
const client = new GreedySMS({
  apiKey?: string,       // Optional if GREEDY_SMS_API_KEY env var is set
  baseUrl?: string,      // Default: https://api.greedy-sms.com
  timeout?: number,      // Request timeout in milliseconds (default: 30000)
});
```

### System & User
- `checkHealth(): Promise<HealthResponse>` - Check if API service is online.
- `getMe(): Promise<UserInfo>` - Retrieve user account profile, purchases, discount, and balance.
- `getBalance(): Promise<number>` - Convenience method returning account balance in rubles.

### Activations
- `getOperators(country?): Promise<OperatorCountryInfo[]>` - List mobile operators by country.
- `getCountries(options?): Promise<GetCountriesResponse>` - List countries with pagination.
- `getServices(options?): Promise<GetServicesResponse>` - List available services.
- `getPrices(options?): Promise<GetPricesResponse>` - Query prices and available stock.
- `getNumbersStatus(options): Promise<GetNumbersStatusResponse>` - Check available count for a service.
- `getListOfTopCountriesByService(service): Promise<TopCountryPriceItem[]>` - Top 10 countries by service.
- `getTopCountriesByService(options): Promise<GetTopCountriesResponse>` - Top countries with pagination.
- `getNumber(options): Promise<OrderedNumber>` - Purchase a phone number.
- `getStatus(activationId): Promise<ActivationStatusResponse>` - Check activation status and code.
- `getStatusAlternative(activationId): Promise<ActivationStatusResponse>` - Check local activation status.
- `setStatus(activationId, status): Promise<ActivationStatusResponse>` - Set status ('Cancel', 'Finish', 'NewCode').
- `cancelActivation(activationId): Promise<ActivationStatusResponse>` - Cancel order and refund balance.
- `finishActivation(activationId): Promise<ActivationStatusResponse>` - Complete activation.
- `requestNewCode(activationId): Promise<ActivationStatusResponse>` - Request another SMS code.
- `getHistory(options?): Promise<GetHistoryResponse>` - Retrieve activation history.

### Long-term Rental
- `getRentPrices(options): Promise<Record<string, unknown>>` - List rental prices.
- `getRentList(options?): Promise<GetRentListResponse>` - List user rentals.
- `getRentStatus(options): Promise<GetRentStatusResponse>` - Retrieve rental status and SMS messages.
- `getContinueRentPriceNumber(options): Promise<{ price: number }>` - Check extension price.
- `getRentNumber(options): Promise<OrderedRentNumber>` - Order a number for rent.
- `setRentStatus(options): Promise<{ status: string }>` - Update rental status.
- `continueRentNumber(options): Promise<ContinuedRentNumber>` - Extend active rental.
- `continueRentNumberV2(options): Promise<ContinuedRentNumber>` - Idempotent extension.

### Disposable Email Verification
- `getMailDomains(url): Promise<MailDomainItem[]>` - Get available mail domains for website.
- `getMailPrice(url, domain): Promise<MailPriceQuote>` - Get price quote for email address.
- `buyMailDomain(url, domain): Promise<OrderedMailDomain>` - Buy temporary email address.
- `reorderMailDomain(id): Promise<OrderedMailDomain>` - Reorder/reactivate existing email address.
- `getMailStatus(id): Promise<MailStatusResponse>` - Check received email and verification code.
- `cancelMailOrder(id): Promise<CancelMailOrderResponse>` - Cancel email order.
- `getMailOrders(options?): Promise<GetMailOrdersResponse>` - List email orders.

### Legacy Compatibility
- `handlerApi(action, params?): Promise<string>` - Direct call to `/stubs/handler_api.php`.

## Error Handling

All API errors inherit from `GreedySMSError`:

```typescript
import {
  GreedySMS,
  GreedySMSError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
} from "greedy-sms";

try {
  const order = await client.getNumber({ service: "tg", country: 2 });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error(`Throttled. Retry after ${error.retryAfterSeconds} seconds.`);
  } else if (error instanceof ValidationError) {
    console.error("Validation failed:", error.fields);
  } else if (error instanceof GreedySMSError) {
    console.error(`API Error [${error.code}]: ${error.message}`);
  }
}
```

## Official Documentation

- API Reference: [https://api.greedy-sms.com/docs](https://api.greedy-sms.com/docs)

## License

ISC
