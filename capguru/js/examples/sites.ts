/**
 * Site-specific click presets.
 *
 *   CAPGURU_API_KEY=... npx tsx examples/sites.ts binance ./image.png dog
 *   commands: binance, tiktok, aws, temu, bitget, linkvertise, seofast, worldcash
 */
import { readFileSync } from 'node:fs';
import { CapGuruClient } from '../src/index.js';

function b64(path: string | undefined): string {
  if (!path) {
    console.error('Pass an image path');
    process.exit(1);
  }
  return readFileSync(path).toString('base64');
}

async function main(): Promise<void> {
  const apiKey = process.env.CAPGURU_API_KEY;
  if (!apiKey) {
    console.error('Set CAPGURU_API_KEY');
    process.exit(1);
  }
  const client = new CapGuruClient(apiKey);
  const command = process.argv[2];
  const path = process.argv[3];
  const extra = process.argv[4];

  switch (command) {
    case 'binance':
      console.log(await client.solveBinance({ body: b64(path), object: extra ?? 'dog' }));
      return;
    case 'tiktok':
      console.log(
        await client.solveTikTok({
          variant: 'slider',
          body: b64(path),
        }),
      );
      return;
    case 'aws':
      console.log(
        await client.solveAws({
          body: b64(path),
          instruction: extra ?? "Place a dot at the end of the car's path",
        }),
      );
      return;
    case 'temu':
      console.log(await client.solveTemu({ body: b64(path), textinstructions: extra ?? 'Select the matching object' }));
      return;
    case 'bitget':
      console.log(await client.solveBitget({ body: b64(path) }));
      return;
    case 'linkvertise':
      console.log(await client.solveLinkvertise({ body: b64(path), instruction: extra ?? 'click the matching icon' }));
      return;
    case 'seofast':
      console.log(await client.solveSeoFast({ body: b64(path), instruction: extra ?? 'click the matching icon' }));
      return;
    case 'worldcash':
      console.log(await client.solveWorldCash({ body: b64(path) }));
      return;
    default:
      console.error(
        'Usage: sites.ts <binance|tiktok|aws|temu|bitget|linkvertise|seofast|worldcash> image [hint]',
      );
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
