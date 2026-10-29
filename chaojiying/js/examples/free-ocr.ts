import { readFile } from "node:fs/promises";
import { Chaojiying, FreeModel } from "../src/index.js";

/**
 * Free OCR v2. Does not spend 题分. Needs CHAOJIYING_API_KEY from the user center.
 *   npx tsx examples/free-ocr.ts image.jpg text
 *   npx tsx examples/free-ocr.ts math.jpg calc
 *   npx tsx examples/free-ocr.ts blocks.jpg blocks
 */
async function main() {
  const [file, modelArg = "text"] = process.argv.slice(2);
  const apiKey = process.env.CHAOJIYING_API_KEY;
  if (!apiKey || !file) {
    console.error("Usage: CHAOJIYING_API_KEY=... npx tsx examples/free-ocr.ts <image> [text|calc|blocks]");
    process.exit(1);
  }
  const model = modelArg === "calc" ? FreeModel.CALC : modelArg === "blocks" ? FreeModel.BLOCKS : FreeModel.TEXT;
  const client = new Chaojiying({ apiKey });
  const result = await client.recognizeFree(await readFile(file), model);
  console.log(result.pic_str);
  if (result.rectangles) console.log(result.rectangles);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
