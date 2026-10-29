import { GiveSms } from "../src/index.js";

/**
 * Long-term rent API. createorder and prolong charge the account.
 *
 *   GIVE_SMS_API_KEY=... npx tsx examples/rent.ts
 */
async function main(): Promise<void> {
  const apiKey = process.env.GIVE_SMS_API_KEY;
  if (!apiKey) {
    console.log("Set GIVE_SMS_API_KEY. Listing countries does not rent a number.");
    return;
  }
  const client = new GiveSms({ apiKey });
  const countries = await client.rentCountries();
  console.log("Rent countries:", countries.count ?? Object.keys(countries).length);
  const kazakhstan = await client.rentGetDataCountry({ country: "KZ" });
  console.log("Kazakhstan rent payload keys:", Object.keys(kazakhstan));
  const orders = await client.rentAllOrders();
  console.log("Orders:", orders.count);

  if (process.env.GIVE_SMS_ALLOW_PAID !== "1") {
    console.log("Set GIVE_SMS_ALLOW_PAID=1 to rent. Rentals are not refundable.");
    return;
  }

  const order = await client.rentCreateOrder({
    type: "week",
    period: 1,
    services: [82],
    country: "KZ",
    operator: "ANY",
  });
  console.log("Rented", order.phone, "until", order.endTime);
  const inbox = await client.rentWaitForSms(order.orderId, { timeoutMs: 30_000, intervalMs: 5_000 });
  console.log(inbox.messages.map((message) => message.text));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
