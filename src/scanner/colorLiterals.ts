import tinycolor from 'tinycolor2';
import { isValidColor } from '../utils/colorUtils';

export interface ColorLiteral {
  /** Canonical value (from isValidColor) used to match palette entries. */
  value: string;
  /** Raw matched text, e.g. "#fff" or "rgb(0, 0, 0)". */
  raw: string;
  /** Offsets within the scanned text. */
  start: number;
  end: number;
}

export interface DetectOptions {
  matchNamedColors?: boolean;
}

const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const FUNC_RE = /\b(?:rgba?|hsla?|hsva?)\(\s*[0-9.,%\s/]+\)/gi;

let namedRe: RegExp | undefined;
function getNamedRe(): RegExp {
  if (!namedRe) {
    const names = Object.keys(
      (tinycolor as unknown as { names: Record<string, string> }).names || {}
    ).sort((a, b) => b.length - a.length);
    // Word-bounded alternation so we don't match inside identifiers.
    namedRe = new RegExp(`\\b(?:${names.join('|')})\\b`, 'gi');
  }
  return namedRe;
}

/**
 * Find color literals in `text`. Each candidate is validated through
 * tinycolor2 (via isValidColor) so false positives are dropped, and the
 * canonical `value` is what callers compare against palette entries.
 */
export function findColorLiterals(
  text: string,
  options: DetectOptions = {}
): ColorLiteral[] {
  const raws: { raw: string; start: number; end: number }[] = [];

  const collect = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      raws.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
    }
  };

  collect(HEX_RE);
  collect(FUNC_RE);
  if (options.matchNamedColors) {
    collect(getNamedRe());
  }

  // Longest-first so a wrapping match wins over a nested one.
  raws.sort((a, b) => a.start - b.start || b.end - a.end);

  const result: ColorLiteral[] = [];
  let lastEnd = -1;
  for (const cand of raws) {
    if (cand.start < lastEnd) {
      continue; // overlaps an already-accepted match
    }
    const { isValid, acceptableColor } = isValidColor(cand.raw);
    if (!isValid || !acceptableColor) {
      continue;
    }
    result.push({
      value: acceptableColor,
      raw: cand.raw,
      start: cand.start,
      end: cand.end,
    });
    lastEnd = cand.end;
  }
  return result;
}
