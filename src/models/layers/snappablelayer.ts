import LayerWms from './layerwms';
import Layer from './layer';
import BaseLayer from './baselayer';

const snappableLayer = [LayerWms] as const;

export type SnappableLayer = InstanceType<(typeof snappableLayer)[number]>;

export const isSnappableLayer = (layer: Layer | BaseLayer): layer is SnappableLayer => {
  return snappableLayer.some((ctr) => layer instanceof ctr) && !!(layer as SnappableLayer).snapOptions;
};
