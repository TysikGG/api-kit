import { YesCaptcha } from "yescaptcha-client";

const client = new YesCaptcha({
  clientKey: process.env.YESCAPTCHA_CLIENT_KEY!,
});

const balance = await client.getBalance();
console.log("Account balance:", balance);
