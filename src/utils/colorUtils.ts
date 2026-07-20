import tinycolor from 'tinycolor2';
type AcceptableFormat = 'hex' | 'rgb' | 'hsl' | 'hsv';
export function isValidColor(input: string): {
  isValid: boolean;
  acceptableColor?: string;
} {
  const color = tinycolor(input);
  if (!color.isValid()) {
    return { isValid: false };
  }
  const format = color.getFormat();
  const acceptableFormats: AcceptableFormat[] = ['hex', 'rgb', 'hsl', 'hsv'];

  if (acceptableFormats.includes(format as AcceptableFormat)) {
    return {
      isValid: true,
      acceptableColor: color.toString(format as AcceptableFormat),
    };
  }

  const alphaFixMap: Record<string, AcceptableFormat> = {
    hex8: 'hex',
    rgba: 'rgb',
    hsla: 'hsl',
    hsva: 'hsv',
  };

  if (format in alphaFixMap) {
    const newFormat = alphaFixMap[format];
    return {
      isValid: true,
      acceptableColor: color.toString(newFormat),
    };
  }

  // Named CSS colors (e.g. "red") canonicalize to hex so they match hex
  // palette entries and can be stored consistently.
  if (format === 'name') {
    return { isValid: true, acceptableColor: color.toHexString() };
  }

  return { isValid: false };
}
// Normalize any input to hex and remember the format
function normalizeToHex(colorInput: string): {
  hex: string;
  format: AcceptableFormat;
} {
  const color = tinycolor(colorInput);
  const format = color.getFormat() as AcceptableFormat;

  const acceptableFormats: AcceptableFormat[] = ['hex', 'rgb', 'hsl', 'hsv'];
  const alphaFixMap: Record<string, AcceptableFormat> = {
    hex8: 'hex',
    rgba: 'rgb',
    hsla: 'hsl',
    hsva: 'hsv',
  };

  const resolvedFormat = acceptableFormats.includes(format)
    ? format
    : alphaFixMap[format] || 'hex';

  return {
    hex: color.toHexString(),
    format: resolvedFormat,
  };
}

// Convert all shade hexes to original format
function convertShadesToFormat(
  hexShades: Record<string, string>,
  format: AcceptableFormat
): Record<string, string> {
  const converted: Record<string, string> = {};
  for (const [key, hex] of Object.entries(hexShades)) {
    const color = tinycolor(hex);
    switch (format) {
      case 'rgb':
        converted[key] = color.toRgbString();
        break;
      case 'hsl':
        converted[key] = color.toHslString();
        break;
      case 'hsv':
        converted[key] = color.toHsvString();
        break;
      case 'hex':
      default:
        converted[key] = color.toHexString();
    }
  }
  return converted;
}

// Unified utility: convert, call getColors, convert back
export async function getFormattedShades(colorInput: string): Promise<{
  shades: { key: string; value: string }[];
}> {
  const { getColors } = await import('theme-colors');

  const { hex, format } = normalizeToHex(colorInput);
  const shadesObj = getColors(hex);
  const converted = convertShadesToFormat(shadesObj, format);
  const shadesArray = Object.entries(converted).map(([key, value]) => ({
    key,
    value,
  }));

  return {
    shades: shadesArray,
  };
}
