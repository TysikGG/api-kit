import { SvNumber } from "sv-number";

const client = new SvNumber({
  apiKey: process.env.SV_NUMBER_API_KEY!,
});

const balance = await client.getBalance();
const services = await client.getServicesAndCost({ country: 0 });

console.log(`Balance: $${balance}`);
console.log(`Available services in country 0: ${services.length}`);
