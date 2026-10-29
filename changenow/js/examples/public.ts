/**
 * Anonymous catalogue, version-3 quote, and legacy v1 reads.
 * No API key. Does not create an exchange.
 *
 *   npx tsx examples/public.ts
 */
import {
  ChangeNow,
  ChangeNowError,
  buildExchangeLink,
  isTerminalExchangeStatus,
  parseExchangeWebhook,
  splitAssetId,
} from "../src/index.js";

async function main(): Promise<void> {
  const client = new ChangeNow({ timeoutMs: 30_000, retries: 2 });

  const split = splitAssetId("usdt.trx");
  console.log("split usdt.trx:", split.currency, split.network);

  const link = buildExchangeLink({
    from: "btc",
    to: "eth",
    amount: "0.1",
    fixedRate: true,
    lang: "de",
  });
  const fiatLink = buildExchangeLink({ from: "usd", to: "btc", amount: "100", fiatMode: true });
  console.log(link);
  console.log(fiatLink);

  const webhook = parseExchangeWebhook({ id: "example", status: "finished" });
  console.log("webhook terminal:", isTerminalExchangeStatus(webhook.status));

  const page = await client.listAssets({ limit: 2, network: "btc", kind: "crypto" });
  if (typeof page === "string") {
    throw new Error("expected a JSON catalogue page");
  }
  console.log("assets page:", page.returned, page.assets[0]?.ticker);

  const csv = await client.listAssets({ format: "csv", network: "btc", limit: undefined });
  console.log("csv chars:", csv.length);

  const manual = await client.getAssetManual();
  console.log("asset manual chars:", manual.length);

  const few = await client.listAllAssets({ network: "btc", limit: 2 }, { maxPages: 1 });
  console.log("listAllAssets:", few.length);

  const btc = await client.getAsset("btc");
  console.log("asset:", btc.ticker);

  const estimate = await client.getPublicEstimate({
    fromCurrency: "btc",
    fromNetwork: "btc",
    toCurrency: "eth",
    toNetwork: "eth",
    fromAmount: "0.1",
    flow: "standard",
    type: "direct",
  });
  console.log("public estimate:", typeof estimate === "string" ? estimate.slice(0, 40) : estimate.quote);

  const reverse = await client.getPublicEstimate({
    fromCurrency: "btc",
    fromNetwork: "btc",
    toCurrency: "eth",
    toNetwork: "eth",
    toAmount: "1",
    flow: "fixed-rate",
    type: "reverse",
  });
  console.log("reverse quote type:", typeof reverse);

  const publicManual = await client.getPublicManual();
  console.log("v3 manual chars:", publicManual.length);

  const currencies = await client.getCurrenciesV1({ active: true });
  console.log("v1 currencies:", currencies.length);

  const targets = await client.getCurrenciesToV1("btc");
  console.log("v1 targets from btc:", targets.length);

  const info = await client.getCurrencyInfoV1("btc");
  console.log("v1 btc ticker:", info.ticker);

  const min = await client.getMinAmountV1("btc", "eth");
  console.log("v1 min:", min.minAmount);

  const amount = await client.getExchangeAmountV1("0.1", "btc", "eth");
  console.log("v1 estimatedAmount:", amount.estimatedAmount);

  const range = await client.getExchangeRangeV1("btc", "eth");
  console.log("v1 range:", range.minAmount, range.maxAmount);

  const pairs = await client.getMarketPairsV1();
  console.log("v1 market pairs:", pairs.length, pairs[0]);

  try {
    const address = await client.validateAddressV1(
      "eth",
      "0x57f31ad4b64095347F87eDB1675566DAfF5EC886"
    );
    console.log("v1 address valid:", address.result);
  } catch (error) {
    if (error instanceof ChangeNowError) {
      console.log("v1 address check:", error.statusCode, error.message);
    } else {
      throw error;
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
