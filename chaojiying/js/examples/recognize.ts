import { readFile } from "node:fs/promises";
import { Chaojiying, CodeType, clickInstruction, colorInstruction } from "../src/index.js";

/**
 * Paid recognition. Pass an image path and a codetype name or number.
 *   npx tsx examples/recognize.ts captcha.jpg 1004
 *   npx tsx examples/recognize.ts click.png 9801 查,找
 *   npx tsx examples/recognize.ts mixed.png 6900 red
 */
async function main() {
  const [file, typeArg, extra] = process.argv.slice(2);
  const username = process.env.CHAOJIYING_USER;
  const password = process.env.CHAOJIYING_PASS;
  if (!username || !password || !file || !typeArg) {
    console.error("Usage: CHAOJIYING_USER=... CHAOJIYING_PASS=... npx tsx examples/recognize.ts <image> <codetype> [extra]");
    process.exit(1);
  }

  const named = (CodeType as Record<string, number>)[typeArg];
  const codeType = named ?? Number(typeArg);
  let strDebug: string | undefined;
  if (codeType === CodeType.LOCATE_CHARS && extra) {
    strDebug = clickInstruction(extra.split(","));
  } else if (codeType === CodeType.MIXED_COLOR && extra) {
    strDebug = colorInstruction(extra);
  } else if (extra) {
    strDebug = extra;
  }

  const client = new Chaojiying({ username, password });
  const image = await readFile(file);
  const result = await client.recognize(image, codeType, { strDebug, lenMin: 0 });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
