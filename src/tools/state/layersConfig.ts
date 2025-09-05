import BaseLayer from '../../models/layers/baselayer';

export default class LayersConfig {
  layersList: BaseLayer[] = [];
  extLayerIds: { [layerUid: string]: number } = {};
}
