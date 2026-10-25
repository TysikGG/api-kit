import { Peak } from "peak-client";

const client = new Peak({
  apiKey: process.env.PEAK_API_KEY!,
});

const balance = await client.getBalance();
console.log("Account balance:", balance);
