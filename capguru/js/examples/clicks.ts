/**
 * Generic click, grid, and slider helpers.
 *
 *   CAPGURU_API_KEY=... npx tsx examples/clicks.ts recaptcha ./image.png "traffic lights"
 *   commands: click, recaptcha, hcaptcha, funcaptcha, geetest, slider
 */
import { readFileSync } from 'node:fs';
import { CLICK, CapGuruClient, scaleSliderOffset, sliderOffset } from '../src/index.js';

const apiKey = process.env.CAPGURU_API_KEY;

function image(path: string | undefined): string {
  if (!path) {
    console.error('Pass an image path');
    process.exit(1);
  }
  return readFileSync(path).toString('base64');
}

async function main(): Promise<void> {
  if (!apiKey) {
    console.error('Set CAPGURU_API_KEY');
    process.exit(1);
  }
  const client = new CapGuruClient(apiKey);
  const command = process.argv[2];
  const path = process.argv[3];
  const instruction = process.argv[4] ?? 'slider';

  switch (command) {
    case 'click': {
      console.log(await client.solveClick({ textinstructions: instruction, click: CLICK.OTHER, body: image(path) }));
      return;
    }
    case 'recaptcha': {
      console.log(await client.solveRecaptchaClick({ textinstructions: instruction, body: image(path), grid: true }));
      return;
    }
    case 'hcaptcha': {
      console.log(await client.solveHCaptchaClick({ textinstructions: instruction, body: image(path) }));
      return;
    }
    case 'funcaptcha': {
      console.log(await client.solveFunCaptchaClick({ textinstructions: instruction, body: image(path) }));
      return;
    }
    case 'geetest': {
      console.log(await client.solveGeeTestClick({ textinstructions: instruction, body: image(path) }));
      return;
    }
    case 'slider': {
      const piece = process.argv[4];
      const solution = await client.solveSlider({
        body: image(path),
        piece: piece ? readFileSync(piece).toString('base64') : undefined,
      });
      const offset = sliderOffset(solution);
      console.log(solution);
      if (offset != null) {
        console.log('scaled', scaleSliderOffset(offset, { windowWidth: 280 }));
      }
      return;
    }
    default:
      console.error('Usage: clicks.ts <click|recaptcha|hcaptcha|funcaptcha|geetest|slider> image [instruction|piece]');
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
