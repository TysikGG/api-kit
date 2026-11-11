# hero-sms-client

TypeScript / JavaScript client for the [HeroSMS](https://hero-sms.com/ru/api) SMS activation and rental API.

## Features

- Full support for activations and number rental
- TypeScript types and definitions included
- Custom error hierarchy (`NoNumbersError`, `AuthenticationError`, `EarlyCancelError`, etc.)
- Supports both standard and V2 detailed endpoints (`getNumberV2`, `getStatusV2`)
- Safe directory methods for countries, services, operators, and pricing

## Installation

```bash
npm install hero-sms-client
```

## Quick Start

```typescript
import { HeroSMS } from "hero-sms-client";

const client = new HeroSMS({
  apiKey: process.env.HERO_SMS_API_KEY!,
});

// Check balance
const balance = await client.getBalance();
console.log(`Balance: $${balance}`);

// List available countries
const countries = await client.getCountries();
console.log(`Available countries: ${Object.keys(countries).length}`);
```

## Receiving SMS Verification

```typescript
import { HeroSMS, ActivationStatusCode } from "hero-sms-client";

const client = new HeroSMS({ apiKey: "your-api-key" });

// 1. Request a number for Telegram in Kazakhstan (country code 2)
const { activationId, phoneNumber } = await client.getNumber({
  service: "tg",
  country: 2,
});
console.log(`Received phone: ${phoneNumber}, ID: ${activationId}`);

// 2. Inform the server that you are ready to receive SMS
await client.markReady(activationId);

// 3. Poll for SMS code
const status = await client.getStatus(activationId);
if (status.status === "STATUS_OK") {
  console.log(`Received SMS code: ${status.code}`);

  // 4. Confirm completion
  await client.complete(activationId);
} else if (status.status === "STATUS_WAIT_CODE") {
  console.log("Waiting for incoming SMS...");
}
```

## API Reference

### Client Configuration

```typescript
const client = new HeroSMS({
  apiKey: "your-api-key",    // Required
  baseUrl?: string,          // Optional custom endpoint URL
  timeout?: number,          // Optional timeout in ms (default: 30000)
});
```

### Account
- `getBalance(): Promise<number>` - Retrieve current account balance.

### Numbers & Activations
- `getNumber(options): Promise<ParsedNumberResponse>` - Request an activation number.
- `getNumberV2(options): Promise<GetNumberV2Response>` - Request an activation number with detailed JSON response.
- `setStatus(id, status): Promise<string>` - Update activation status.
- `markReady(id): Promise<string>` - Mark activation ready to receive SMS (status 1).
- `requestResend(id): Promise<string>` - Request SMS resend (status 3).
- `complete(id): Promise<string>` - Confirm activation completion (status 6).
- `cancel(id): Promise<string>` - Cancel activation and release balance (status 8).
- `getStatus(id): Promise<ParsedStatusResponse>` - Check activation status and received code.
- `getStatusV2(id): Promise<ActivationStatusV2>` - Check detailed activation status.
- `getActiveActivations(options?): Promise<ActiveActivationsResponse>` - List current active activations.
- `getHistory(options?): Promise<ActivationHistoryItem[]>` - Retrieve activation history.
- `reactivate(id): Promise<GetNumberV2Response>` - Reactivate an existing activation.
- `getReactivationPrice(id): Promise<ReactivationPriceResponse>` - Query price for reactivation.
- `getAllSms(options): Promise<GetAllSmsResponse>` - Retrieve all incoming SMS messages for an activation.
- `finishActivation(id): Promise<void>` - Finalize activation work.
- `cancelActivation(id): Promise<void>` - Cancel activation purchase.

### Catalogs & Directories
- `getCountries(): Promise<CountriesResponse>` - List supported countries.
- `getServicesList(options?): Promise<ServicesListResponse>` - List supported services.
- `getOperators(country?): Promise<OperatorsResponse>` - List mobile operators.
- `getPrices(options?): Promise<PricesByCountry>` - Query prices and quantities.
- `getTopCountriesByService(options?): Promise<TopCountryInfo[]>` - Retrieve top countries for a service.
- `getTopCountriesByServiceRank(options?): Promise<TopCountryInfo[]>` - Retrieve top countries based on user rank.

### Rental
- `getRentPrices(options): Promise<RentCountByService>` - Get rental prices and available counts.
- `getRentServicesAndCountries(options): Promise<GetRentServicesAndCountriesResponse>` - List rental options.
- `getRentNumber(options): Promise<GetNumberV2Response>` - Rent a number for a designated duration.

## Error Handling

All client errors inherit from `HeroSMSError`:

```typescript
import {
  HeroSMS,
  HeroSMSError,
  NoNumbersError,
  NoBalanceError,
  AuthenticationError,
  EarlyCancelError,
} from "hero-sms-client";

try {
  const result = await client.getNumber({ service: "tg", country: 2 });
} catch (error) {
  if (error instanceof NoNumbersError) {
    console.error("No numbers available right now.");
  } else if (error instanceof NoBalanceError) {
    console.error("Please top up your balance.");
  } else if (error instanceof HeroSMSError) {
    console.error(`HeroSMS API error [${error.code}]: ${error.message}`);
  }
}
```

## Official Documentation

- API Docs: [https://hero-sms.com/ru/api](https://hero-sms.com/ru/api)

## License

ISC
