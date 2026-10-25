import { GrizzlySms } from "grizzly-sms";

const sms = new GrizzlySms({
  apiKey: process.env.GRIZZLY_API_KEY!,
});

const balance = await sms.getBalance();
const countries = await sms.getCountries();
console.log(balance, countries.length);
