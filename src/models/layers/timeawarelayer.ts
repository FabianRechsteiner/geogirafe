import LayerWms from './layerwms';
import GroupLayer from './grouplayer';
import Layer from './layer';
import BaseLayer from './baselayer';

const timeAwareLayer = [GroupLayer, LayerWms] as const;

export type TimeAwareLayer = InstanceType<(typeof timeAwareLayer)[number]>;

export const isTimeAwareLayer = (layer: Layer | BaseLayer): layer is TimeAwareLayer => {
  return timeAwareLayer.some((ctr) => layer instanceof ctr) && !!(layer as TimeAwareLayer).timeOptions;
};
