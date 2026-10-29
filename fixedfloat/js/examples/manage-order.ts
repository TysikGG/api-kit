/**
 * Read an existing order, optionally subscribe an email, print QR codes, and poll.
 * Does not choose an emergency action unless FIXEDFLOAT_EMERGENCY is EXCHANGE or REFUND.
 *
 *   FIXEDFLOAT_ORDER_ID=... FIXEDFLOAT_ORDER_TOKEN=... \
 *     FIXEDFLOAT_API_KEY=... FIXEDFLOAT_API_SECRET=... npx tsx examples/manage-order.ts
 */
import { FixedFloat } from "../src/index.js";

async function main(): Promise<void> {
  const id = process.env.FIXEDFLOAT_ORDER_ID;
  const token = process.env.FIXEDFLOAT_ORDER_TOKEN;
  if (!id || !token) {
    console.log("Set FIXEDFLOAT_ORDER_ID and FIXEDFLOAT_ORDER_TOKEN to inspect an order.");
    return;
  }

  const client = new FixedFloat({
    apiKey: process.env.FIXEDFLOAT_API_KEY,
    apiSecret: process.env.FIXEDFLOAT_API_SECRET,
  });

  const order = await client.getOrder(id, token);
  console.log(`${order.id} ${order.status} (${client.statusText(order.status)})`);
  console.log(`Emergency: ${JSON.stringify(order.emergency ?? null)}`);

  const email = process.env.FIXEDFLOAT_EMAIL;
  if (email) {
    console.log("Email subscribed:", await client.setEmail(id, token, email));
  }

  const qr = await client.getQr(id, token);
  for (const code of qr.codes) {
    console.log(`QR ${code.title} checked=${String(code.checked)} bytes=${code.src.length}`);
  }

  const choice = process.env.FIXEDFLOAT_EMERGENCY;
  if (choice === "EXCHANGE" || choice === "REFUND") {
    const ok = await client.setEmergency({
      id,
      token,
      choice,
      address: process.env.FIXEDFLOAT_REFUND_ADDRESS,
      tag: process.env.FIXEDFLOAT_TAG,
    });
    console.log("Emergency choice accepted:", ok);
  }

  if (process.env.FIXEDFLOAT_WAIT === "1") {
    const finished = await client.waitForOrder(id, token, {
      timeoutMs: 60_000,
      intervalMs: 5_000,
    });
    console.log("Wait result:", finished.status);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
