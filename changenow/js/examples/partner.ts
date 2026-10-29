/**
 * Partner v2 and keyed v1 reads. Creates an order only when CHANGENOW_RUN_WRITES=1.
 *
 *   CHANGENOW_API_KEY=... npx tsx examples/partner.ts
 */
import { ChangeNow, ChangeNowError } from "../src/index.js";

async function main(): Promise<void> {
  const apiKey = process.env.CHANGENOW_API_KEY;
  if (!apiKey) {
    console.error("Please set CHANGENOW_API_KEY environment variable.");
    process.exit(1);
  }

  const client = new ChangeNow({ apiKey, timeoutMs: 30_000 });

  const currencies = await client.getCurrencies({ active: true, flow: "standard" });
  console.log("currencies:", currencies.length);

  const pairs = await client.getAvailablePairs({
    fromCurrency: "btc",
    fromNetwork: "btc",
    flow: "standard",
  });
  console.log("pairs:", pairs.length);

  const min = await client.getMinAmount({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    flow: "standard",
  });
  console.log("min:", min.minAmount);

  const range = await client.getRange({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    flow: "fixed-rate",
  });
  console.log("range:", range.minAmount, range.maxAmount);

  const estimate = await client.getEstimatedAmount({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    fromAmount: "0.1",
    flow: "standard",
    type: "direct",
  });
  console.log("estimate:", estimate.toAmount);

  const locked = await client.getEstimatedAmount({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    fromAmount: "0.1",
    flow: "fixed-rate",
    useRateId: true,
  });
  console.log("rateId:", locked.rateId);

  const reverse = await client.getEstimatedAmount({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    toAmount: "1",
    type: "reverse",
    flow: "standard",
  });
  console.log("reverse fromAmount:", reverse.fromAmount);

  const topUp = await client.getEstimatedAmount({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    fromAmount: "0.1",
    isTopUp: true,
  });
  console.log("top-up toAmount:", topUp.toAmount);

  const address = await client.validateAddress({
    currency: "eth",
    address: "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
  });
  console.log("address:", address.result);

  const named = await client.getUserAddresses("example.crypto");
  console.log("name success:", named.success);

  const fees = await client.getNetworkFee({
    fromCurrency: "usdt",
    toCurrency: "usdt",
    fromNetwork: "eth",
    toNetwork: "trx",
    fromAmount: "100",
    flow: "standard",
  });
  console.log("withdrawal fee:", fees.estimatedFee.withdrawal.amount);

  const market = await client.getMarketEstimate({
    fromCurrency: "usd",
    toCurrency: "btc",
    fromAmount: "1000",
    type: "direct",
  });
  console.log("market toAmount:", market.toAmount);

  await optional("getExchanges", () => client.getExchanges({ limit: 10, offset: 0 }));
  await optional("fixed-rate v1", () =>
    client.getFixedRateAmountV1({ amount: "0.1", from: "btc", to: "eth", useRateId: true })
  );
  await optional("list v1 transactions", () => client.listTransactionsV1({ limit: 5 }));

  const transferQuote = await client.getPrivateTransferEstimate({
    currency: "eth",
    network: "eth",
    toAmount: "0.05",
  });
  console.log("private transfer rateId:", transferQuote.rateId);

  if (process.env.CHANGENOW_RUN_WRITES !== "1") {
    console.log("Skipping create, push, and refund. Set CHANGENOW_RUN_WRITES=1 to run them.");
    return;
  }

  const created = await client.createExchange({
    fromCurrency: "btc",
    toCurrency: "eth",
    fromNetwork: "btc",
    toNetwork: "eth",
    fromAmount: String(min.minAmount),
    address: process.env.CHANGENOW_PAYOUT_ADDRESS ?? "0x57f31ad4b64095347F87eDB1675566DAfF5EC886",
    flow: "standard",
  });
  console.log("created:", created.id, created.payinAddress);

  const status = await client.getExchange(created.id);
  await client.getTransaction(created.id);
  await client.getTransactionStatus(created.id);
  console.log("status:", status.status);

  const actions = await client.getExchangeActions(created.id);
  console.log("actions:", actions);
  if (actions.continue?.available) {
    console.log("continue:", await client.continueExchange({ id: created.id }));
  }
  if (actions.refund?.available) {
    console.log("refund:", await client.refundExchange({ id: created.id }));
  }
}

async function optional(label: string, run: () => Promise<unknown>): Promise<void> {
  try {
    const value = await run();
    const size = Array.isArray(value) ? value.length : "ok";
    console.log(label, size);
  } catch (error) {
    if (error instanceof ChangeNowError) {
      console.log(label, "skipped:", error.statusCode, error.message);
      return;
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
