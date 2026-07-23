import tinycolor from 'tinycolor2';

/**
 * Build the replacement text for one occurrence: the new color expressed in
 * the same format as the original literal, so a repo mixing `#hex`, `rgb()`
 * and `hsl()` keeps each file's style. Named colors and unrecognized formats
 * fall back to the canonical new value.
 */
export function formatReplacement(raw: string, newValue: string): string {
  const target = tinycolor(newValue);
  if (!target.isValid()) {
    return newValue;
  }
  const format = tinycolor(raw).getFormat();
  switch (format) {
    case 'hex':
    case 'hex3':
    case 'hex4':
    case 'hex6':
    case 'hex8': {
      const hex =
        target.getAlpha() < 1 ? target.toHex8String() : target.toHexString();
      return isUpperCaseHex(raw) ? hex.toUpperCase() : hex;
    }
    case 'rgb':
      return target.toRgbString();
    case 'hsl':
      return target.toHslString();
    case 'hsv':
      return target.toHsvString();
    default:
      return newValue;
  }
}

// "#FF5733" → true, "#ff5733" / "#Ff5733" / "#123456" → false.
function isUpperCaseHex(raw: string): boolean {
  const digits = raw.slice(1);
  return /[A-F]/.test(digits) && !/[a-f]/.test(digits);
}
