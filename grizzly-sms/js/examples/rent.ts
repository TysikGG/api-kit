/**
 * Rents a number for 4 hours, prints messages, and finishes the rental.
 * This spends balance.
 */
import { GrizzlySms, RentAction } from "../src/index.js";

async function main() {
  const apiKey = process.env.GRIZZLY_API_KEY;
  if (!apiKey) {
    console.error("Set GRIZZLY_API_KEY");
    process.exit(1);
  }
  const sms = new GrizzlySms({ apiKey });
  const prices = await sms.getRentPrices({ service: "tg", country: 0, rentTime: 4 });
  console.log(prices[0]);
  const rented = await sms.getRentNumber({ service: "tg", country: 0, rentTime: 4 });
  console.log(rented.id, rented.number, rented.endDate);
  const status = await sms.getRentStatus(rented.id);
  for (const message of status.messages) {
    console.log(message.phoneFrom, message.text);
  }
  const history = await sms.getRentHistory(rented.id);
  console.log(history.quantity, history.entries.length);
  console.log(await sms.setRentStatus(rented.id, RentAction.Finish));
}

main();
