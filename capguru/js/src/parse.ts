import { DEFAULT_SLIDER_FIELD_WIDTH } from './constants.js';

/** A click or slider coordinate returned by the recognition API. */
export interface Point {
  x: number;
  y: number;
  /** Puzzle-piece width, present on some slider answers (`w=`). */
  w?: number;
}

/**
 * Parsed image-click or slider answer.
 * `points` is set for coordinate answers, `cells` for grid indexes such as `1,2,6,9`.
 */
export interface ClickSolution {
  /** Answer text with a leading `OK|` removed. */
  raw: string;
  points?: Point[];
  cells?: number[];
}

/** GeeTest v3 token fields. */
export interface GeeTestResult {
  challenge: string;
  validate: string;
  seccode: string;
}

/** Result of an Anti-Captcha compatible `/getTaskResult` call once it is ready. */
export interface JsonTaskResult {
  taskId: string;
  status: string;
  solution: unknown;
  raw: unknown;
}

export interface ScaleSliderOptions {
  /** Width of the slider track in the browser, in pixels. */
  windowWidth: number;
  /** Width of the image that was uploaded, when it differs from the on-screen track. */
  imageWidth?: number;
  /** Cap.guru reference field width. Defaults to 271. */
  fieldWidth?: number;
}

/**
 * Parse a click, grid, or slider answer.
 * Coordinate form: `coordinates:x=143,y=53,w=42` or `coordinate:x=44,y=32;x=143,y=11`.
 * Grid form: `1,2,6,9`. Anything else is returned as `raw` only.
 */
export function parseClickAnswer(raw: string): ClickSolution {
  const text = raw.trim().replace(/^OK\|/i, '');
  const labeled = text.match(/coordinates?:\s*(.+)/i);
  if (labeled) {
    const points = parsePoints(labeled[1]);
    if (points.length > 0) {
      return { raw: text, points };
    }
  }

  if (/^\d+(?:\s*,\s*\d+)*$/.test(text)) {
    return {
      raw: text,
      cells: text.split(',').map((part) => Number(part.trim())),
    };
  }

  const unlabeled = parsePoints(text);
  if (unlabeled.length > 0 && /x=/i.test(text) && /y=/i.test(text)) {
    return { raw: text, points: unlabeled };
  }

  return { raw: text };
}

function parsePoints(body: string): Point[] {
  const points: Point[] = [];
  for (const part of body.split(';')) {
    const piece = part.trim();
    if (!piece) continue;
    const x = piece.match(/(?:^|[,&\s])x=(-?\d+(?:\.\d+)?)/i) ?? piece.match(/^x=(-?\d+(?:\.\d+)?)/i);
    const y = piece.match(/(?:^|[,&\s])y=(-?\d+(?:\.\d+)?)/i) ?? piece.match(/^y=(-?\d+(?:\.\d+)?)/i);
    if (!x || !y) continue;
    const w = piece.match(/(?:^|[,&\s])w=(-?\d+(?:\.\d+)?)/i);
    const point: Point = { x: Number(x[1]), y: Number(y[1]) };
    if (w) point.w = Number(w[1]);
    points.push(point);
  }
  return points;
}

/** Horizontal slider distance. Uses the first point's `x`. */
export function sliderOffset(solution: ClickSolution): number | null {
  const point = solution.points?.[0];
  if (!point) return null;
  return point.x;
}

/**
 * Scale a slider offset into on-screen pixels.
 * Image wider than the widget: `offset / imageWidth * windowWidth`.
 * Otherwise Cap.guru's 271px reference field: `offset / fieldWidth * windowWidth`.
 */
export function scaleSliderOffset(offset: number, options: ScaleSliderOptions): number {
  const base = options.imageWidth ?? options.fieldWidth ?? DEFAULT_SLIDER_FIELD_WIDTH;
  if (!base) return offset;
  return (offset / base) * options.windowWidth;
}

/** Normalize a GeeTest token. Non-JSON answers use validate=raw and seccode=`${raw}|jordan`. */
export function parseGeeTest(raw: string): GeeTestResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      return {
        challenge: String(record.geetest_challenge ?? record.challenge ?? ''),
        validate: String(record.geetest_validate ?? record.validate ?? raw),
        seccode: String(record.geetest_seccode ?? record.seccode ?? ''),
      };
    }
  } catch {
    // Plain token.
  }
  return { challenge: '', validate: raw, seccode: `${raw}|jordan` };
}

/** Pull a token or text out of an Anti-Captcha `solution` object. */
export function readSolutionToken(solution: unknown): string {
  if (typeof solution === 'string') return solution;
  if (solution && typeof solution === 'object') {
    const record = solution as Record<string, unknown>;
    for (const key of ['gRecaptchaResponse', 'token', 'text', 'request']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
  }
  return JSON.stringify(solution);
}
