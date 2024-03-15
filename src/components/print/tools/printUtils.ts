import type { LayerWms, LayerWmts } from '../../../models/main';

/**
 * Determines if a layer is visible based on its opacity and print resolution.
 * @returns true if the layer is visible, otherwise false.
 */
export const isLayerVisible = (layer: LayerWms | LayerWmts, printResolution?: number): boolean => {
  if (layer.opacity === 0) {
    return false;
  }
  if (printResolution === undefined) {
    return true;
  }
  return printResolution >= (layer.minResolution ?? -1) && printResolution <= (layer.maxResolution ?? Infinity);
};
