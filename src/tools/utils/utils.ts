/**
 * Checks if on Safari.
 * @returns True if on Safari.
 */
export const isSafari = () => {
  return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};

/**
 * Returns a valid index within the given maximum index.
 * Out of bound index loops back to the first valid index.
 * @param index - The index to validate.
 * @param maxIndex - The maximum index. If not provided or 0, returns 0.
 * @returns The valid index.
 */
export const getValidIndex = (index: number, maxIndex?: number): number => {
  if (!maxIndex) {
    return 0;
  }
  return index < 0 ? maxIndex : index % (maxIndex + 1);
};

/**
 * Returns a value bounded between a minimum and maximum limit.
 * @returns The bounded value.
 */
export const minMax = (value: number, minLimit: number, maxLimit: number): number => {
  return Math.min(Math.max(value, minLimit), maxLimit);
};

/**
 * Transforms a hex string into rgba values.
 * @param hex - A hex color, starting with '#' and including 3 (=shorthand), 6 (=default) or 8 (=including alpha) values.
 * @returns an array of rgba values: R, G, B [0-255], alpha [0-1]. Or null if the hex color is invalid.
 */
export const hexToRgbaArray = (hex: string): [number, number, number, number] | null => {
  if (!hex.startsWith('#') || (hex.length !== 4 && hex.length !== 7 && hex.length !== 9)) {
    return null;
  }
  let r, g, b: number;
  let a = 1;

  // Expand shorthand form (e.g. "#03F") to full form (e.g. "#0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (_m, r: string, g: string, b: string) => '#' + r + r + g + g + b + b);

  if (hex.length >= 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);

    if (hex.length === 9) {
      // Contains alpha value
      a = Math.round(100 * (parseInt(hex.slice(7, 9), 16) / 255)) / 100;
    }
    if ([r, g, b, a].includes(NaN)) {
      return null;
    }
    return [r, g, b, a];
  }
  return null;
};

/**
 * Transforms a rgb string into rgba values.
 * @param rgbaStr - A rgb or rgba color, starting with 'rgb' and including 3 or 4 (=including alpha) values.
 * @returns an array of rgba values: R, G, B [0-255] and alpha [0-1]. Or null if the rgb string is invalid.
 */
export const rgbStrToRgbaArray = (rgbaStr: string): [number, number, number, number] | null => {
  if (!rgbaStr.startsWith('rgb')) {
    return null;
  }
  let rgb: number[];
  const alpha = 1;

  try {
    rgb = rgbaStr.replace(/[^\d,.-]/g, '').split(',').map((c, idx) => idx < 3 ? Math.round(Number(c)) : Number(c));
  } catch (e) {
    return null;
  }

  // Do some general validation
  if (rgb.length === 3) {
    rgb.push(alpha);
  } else if (rgb.length < 3 || rgb.length > 4) {
    return null;
  }
  if (rgb.includes(NaN) || rgb.some(c => c < 0 || c > 255) || rgb[3] > alpha) {
    return null;
  }

  return rgb as [number, number, number, number];
};

/**
 * Transform a color string to an array of rgba values.
 * @param color A string representing a color. Can be of type hex ('#0033ff') or rgb(a) ('rgba(255, 23, 15, 0.5)').
 * @returns an array of rgba values: R, G, B [0-255] and alpha [0-1]. Or null if the color isn't in a valid format.
 */
export const colorToRgbaArray = (color: string): [number, number, number, number] | null => {
  let rgbaColor = hexToRgbaArray(color);
  if (!rgbaColor) {
    rgbaColor = rgbStrToRgbaArray(color);
  }
  return rgbaColor;
};

