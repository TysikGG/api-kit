/**
 * Image and text solvers. Requires a local file for image commands.
 *
 *   CAPGURU_API_KEY=... npx tsx examples/images.ts image ./captcha.png
 *   commands: image, file, text
 */
import { readFileSync } from 'node:fs';
import { CapGuruClient, VERNET } from '../src/index.js';

const apiKey = process.env.CAPGURU_API_KEY;
const command = process.argv[2];

async function main(): Promise<void> {
  if (!apiKey) {
    console.error('Set CAPGURU_API_KEY');
    process.exit(1);
  }
  const client = new CapGuruClient(apiKey);

  if (command === 'image' || command === 'file') {
    const path = process.argv[3];
    if (!path) {
      console.error('Pass an image path');
      process.exit(1);
    }
    const bytes = readFileSync(path);
    if (command === 'image') {
      console.log(await client.solveImage({ body: bytes.toString('base64'), vernet: VERNET.GENERAL_V2 }));
    } else {
      console.log(await client.solveImageFile(bytes, { filename: 'captcha.png', vernet: VERNET.GENERAL_V2 }));
    }
    return;
  }

  if (command === 'text') {
    const question = process.argv.slice(3).join(' ') || 'What is 2 + 2?';
    console.log(await client.solveText(question, { language: 2 }));
    return;
  }

  console.error('Usage: images.ts <image|file> ./captcha.png | images.ts text "question"');
  process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
