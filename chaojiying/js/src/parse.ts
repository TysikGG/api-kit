import { createHash } from "node:crypto";
import { ChaojiyingError } from "./errors.js";
import type { Plate, Point, Rect, TextLocation } from "./types.js";

/** Paid Processing.php rejects images above 1024KB. */
export const MAX_PAID_IMAGE_BYTES = 1024 * 1024;
/** Free OCR v2 rejects images above 2MB. */
export const MAX_FREE_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Color index for the `{8f:index,tolerance,background/8f}` instruction.
 * Order is fixed by the 6900 guide: red, green, blue, yellow, white, black.
 */
export const ColorChannel = {
  RED: 0,
  GREEN: 1,
  BLUE: 2,
  YELLOW: 3,
  WHITE: 4,
  BLACK: 5,
} as const;

const COLOR_NAMES: Record<string, number> = {
  red: 0,
  green: 1,
  blue: 2,
  yellow: 3,
  white: 4,
  black: 5,
  红: 0,
  绿: 1,
  蓝: 2,
  黄: 3,
  白: 4,
  黑: 5,
};

export type ColorInput = number | keyof typeof ColorChannel | string;

/**
 * Build the 6900 color-filter instruction placed in `str_debug`.
 * Each call costs 8 extra points. The third value is the background and should stay 255.
 */
export function colorInstruction(color: ColorInput, tolerance = 100, background = 255): string {
  const index = resolveColor(color);
  if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 255) {
    throw new ChaojiyingError("Color tolerance must be an integer from 0 to 255.");
  }
  if (!Number.isInteger(background) || background < 0 || background > 255) {
    throw new ChaojiyingError("Color background must be an integer from 0 to 255.");
  }
  return `{8f:${index},${tolerance},${background}/8f}`;
}

function resolveColor(color: ColorInput): number {
  if (typeof color === "number") {
    if (!Number.isInteger(color) || color < 0 || color > 5) {
      throw new ChaojiyingError("Color channel must be an integer from 0 to 5.");
    }
    return color;
  }
  const named = COLOR_NAMES[color.trim().toLowerCase()] ?? COLOR_NAMES[color.trim()];
  if (named === undefined) {
    throw new ChaojiyingError(`Unknown color "${color}". Use 0-5 or red/green/blue/yellow/white/black.`);
  }
  return named;
}

/**
 * Build the 9801 lookup instruction placed in `str_debug`.
 * Characters are returned in the order given. Half-width punctuation only.
 */
export function clickInstruction(chars: readonly string[]): string {
  if (!chars.length) {
    throw new ChaojiyingError("clickInstruction requires at least one character.");
  }
  if (chars.some((char) => char.length === 0 || /[,{}/]/.test(char))) {
    throw new ChaojiyingError("Click characters cannot be empty or contain , { } /.");
  }
  return `{8a:${chars.join(",")}/8a}`;
}

/** Absolute horizontal distance between two points. Used for codetype 9602. */
export function horizontalDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x);
}

/** md5(softid + softkey + pic_id + pic_str), 32 lowercase hex. */
export function computeResponseMd5(
  softId: string,
  softKey: string,
  picId: string,
  picStr: string
): string {
  return createHash("md5").update(`${softId}${softKey}${picId}${picStr}`, "utf8").digest("hex");
}

export function verifyResponseMd5(
  result: { pic_id: string; pic_str: string; md5?: string },
  softId: string,
  softKey: string
): boolean {
  if (!result.md5) return false;
  const expected = computeResponseMd5(softId, softKey, result.pic_id, result.pic_str);
  return expected === result.md5.toLowerCase();
}

function segments(picStr: string): string[] {
  const trimmed = picStr.trim();
  if (!trimmed) return [];
  return trimmed.split("|").map((part) => part.trim()).filter((part) => part.length > 0);
}

function decodeUnicode(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function finite(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ChaojiyingError(`Invalid ${label} in "${value}".`);
  }
  return parsed;
}

/** Parse `x,y|x,y` click and center-point results. */
export function parsePoints(picStr: string): Point[] {
  return segments(picStr).map((part) => {
    const bits = part.split(",");
    if (bits.length !== 2) {
      throw new ChaojiyingError(`Invalid point "${part}". Expected x,y.`);
    }
    return { x: finite(bits[0], "x"), y: finite(bits[1], "y") };
  });
}

/** Parse `x1,y1,x2,y2|...` rectangles from codetype 9900 and free OCR model 9. */
export function parseRectangles(picStr: string): Rect[] {
  return segments(picStr).map((part) => {
    const bits = part.split(",");
    if (bits.length !== 4) {
      throw new ChaojiyingError(`Invalid rectangle "${part}". Expected x1,y1,x2,y2.`);
    }
    return {
      x1: finite(bits[0], "x1"),
      y1: finite(bits[1], "y1"),
      x2: finite(bits[2], "x2"),
      y2: finite(bits[3], "y2"),
    };
  });
}

/** Parse `text,x,y|text,x,y` from codetype 9800. Literal `\\uXXXX` sequences are decoded. */
export function parseTextLocations(picStr: string): TextLocation[] {
  return segments(picStr).map((part) => {
    const match = /^(.*),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(part);
    if (!match) {
      throw new ChaojiyingError(`Invalid text location "${part}". Expected text,x,y.`);
    }
    return {
      text: decodeUnicode(match[1]),
      x: finite(match[2], "x"),
      y: finite(match[3], "y"),
    };
  });
}

/**
 * Parse plate rows: `number,confidence,color,x1,y1,x2,y2`, joined by `|`.
 * @see https://www.chaojiying.com/api-86.html
 */
export function parsePlates(picStr: string): Plate[] {
  return segments(picStr).map((part) => {
    const bits = part.split(",");
    if (bits.length < 7) {
      throw new ChaojiyingError(`Invalid plate "${part}".`);
    }
    const y2 = finite(bits[bits.length - 1], "y2");
    const x2 = finite(bits[bits.length - 2], "x2");
    const y1 = finite(bits[bits.length - 3], "y1");
    const x1 = finite(bits[bits.length - 4], "x1");
    const color = bits[bits.length - 5];
    const confidence = finite(bits[bits.length - 6], "confidence");
    const number = decodeUnicode(bits.slice(0, bits.length - 6).join(","));
    return { number, confidence, color, x1, y1, x2, y2 };
  });
}
