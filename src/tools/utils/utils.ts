import BaseLayer from '../../models/layers/baselayer';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import State from '../state/state';
import { SelectionMode } from '../../models/selection';

/**
 * Checks if the system prefers dark mode.
 * Falls back safely if matchMedia is not supported.
 * @returns True if system is in dark mode.
 */
export const systemIsInDarkMode = () => {
  return (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-color-scheme: dark)').matches
  );
};

/**
 * Checks if on Safari.
 * @returns True if on Safari.
 */
export const isSafari = () => {
  return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};

/**
 * Checks if on Firefox.
 * @returns True if on Firefox.
 */
export const isFirefox = () => {
  return navigator.userAgent.includes('Mozilla') && !navigator.userAgent.includes('Chrome');
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
    r = Number.parseInt(hex.slice(1, 3), 16);
    g = Number.parseInt(hex.slice(3, 5), 16);
    b = Number.parseInt(hex.slice(5, 7), 16);

    if (hex.length === 9) {
      // Contains alpha value
      a = Math.round(100 * (Number.parseInt(hex.slice(7, 9), 16) / 255)) / 100;
    }
    if ([r, g, b, a].includes(Number.NaN)) {
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
    rgb = rgbaStr
      .replace(/[^\d,.-]/g, '')
      .split(',')
      .map((c, idx) => (idx < 3 ? Math.round(Number(c)) : Number(c)));
  } catch {
    return null;
  }

  // Do some general validation
  if (rgb.length === 3) {
    rgb.push(alpha);
  } else if (rgb.length < 3 || rgb.length > 4) {
    return null;
  }
  if (rgb.includes(NaN) || rgb.some((c) => c < 0 || c > 255) || rgb[3] > alpha) {
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
  rgbaColor ??= rgbStrToRgbaArray(color);
  return rgbaColor;
};

/**
 * Check whether the provided text is a matching the correct email form
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@(?:[^\s@.]+\.)+[^\s@.]+$/.test(email);
};

/**
 * Applies the given Opacity to the given Layers (if they have such a Property).
 * @param opacity Value of Opacity
 * @param layers Layers to apply it
 * @param callback Optional Callback after Opacity has been applied
 */
export const applyOpacityToLayers = (opacity: number, layers: BaseLayer[], callback?: (layer: BaseLayer) => void) => {
  for (const layer of layers) {
    if (Object.keys(layer).includes('opacity')) {
      (layer as any as { opacity: number }).opacity = opacity;
      callback?.(layer);
    }
  }
};

/**
 * Applies the given Array of Features to the Selection (<code>state.selection.selectedFeatures</code>) depending on the
 * given SelectionMode (via <code>state.selection.selectionMode</code>).
 * @param features Array of Features to add/replace/remove to/from existing selected Features
 * @param state The State to apply the given Features
 */
export const applyFeaturesToSelection = (features: Feature<Geometry>[], state: State) => {
  // Check if we have set a Geometry of the Selection (e.g. Polygon) and additionally filter the given Features
  if (state.selection.selectionGeometry) {
    features = features.filter((feature) =>
      state.selection.selectionGeometry!.intersectsExtent(feature.getGeometry()!.getExtent())
    );
  }
  switch (state.selection.selectionMode) {
    case SelectionMode.Replace:
      state.selection.selectedFeatures.push(...features);
      break;
    case SelectionMode.Add:
      // Push/Add only Features that are not already in Selection (can happen if you select overlapping Regions
      state.selection.selectedFeatures.push(
        ...features.filter(
          (newlySelectedFeature) =>
            !state.selection.selectedFeatures.some(
              (alreadySelectedFeature) => newlySelectedFeature.getId() === alreadySelectedFeature.getId()
            )
        )
      );
      break;
    case SelectionMode.Remove:
      for (const featureToRemove of features) {
        const idxOfGmlFeatureToRemove = state.selection.selectedFeatures.findIndex(
          (gmlFeature, _idx, _feature) => featureToRemove.getId() === gmlFeature.getId()
        );
        if (idxOfGmlFeatureToRemove > -1) {
          state.selection.selectedFeatures.splice(idxOfGmlFeatureToRemove, 1);
        }
      }
      break;
  }

  const noFeaturesSelected = state.selection.selectedFeatures.length == 0;
  state.interface.selectionComponentVisible = !noFeaturesSelected;
  if (noFeaturesSelected) {
    state.selection.highlightedFeatures = [];
  }
};
const urlRegExp = /(https?:\/\/[^"'<]*?(?=\s|$|<\/[^a]>))/gi;
const telRegExp = /((\b(0041|0)|\B\+41)(\s?\(0\))?(\s)?[1-9]{2}(\s)?\d{3}(\s)?\d{2}(\s)?\d{2}\b)/gi;
const mailRegExp =
  /(^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$)/gi; //NOSONAR(typescript:S5843) As this is the official Regular Expression, we will not mess around with it

export const linkify = (str: string) => {
  if (urlRegExp.test(str)) {
    return str.replaceAll(urlRegExp, '<a href="$1" target="_blank">$1</a>');
  }
  if (mailRegExp.test(str)) {
    return str.replaceAll(mailRegExp, '<a href="mailto:$1" target="_blank">$1</a>');
  }
  if (telRegExp.test(str)) {
    return str.replaceAll(telRegExp, '<a href="tel:$1" target="_blank">$1</a>');
  }
  return str;
};
