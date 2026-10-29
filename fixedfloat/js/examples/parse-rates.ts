/**
 * Offline parser for a FixedFloat rates export. Does not call the network.
 *
 *   npx tsx examples/parse-rates.ts
 */
import { filterRates, parseRatesXml } from "../src/index.js";

const xml = `<?xml version="1.0"?>
<rates>
  <item>
    <from>BTC</from>
    <to>ETH</to>
    <in>1</in>
    <out>17.72</out>
    <amount>191.1</amount>
    <tofee>0.0004 ETH</tofee>
    <minamount>0.001 BTC</minamount>
    <maxamount>2 BTC</maxamount>
  </item>
</rates>`;

const rows = filterRates(parseRatesXml(xml), "BTC", "ETH");
console.log(`${rows[0].in} ${rows[0].from} = ${rows[0].out} ${rows[0].to}`);
console.log(`min ${rows[0].minAmount}, max ${rows[0].maxAmount}, fee ${rows[0].toFee}`);
