import LayerConsts from '../layers/layerconsts';
import LayerOsm from '../layers/layerosm';
import Basemap from './basemap';

export default class BasemapOsm extends Basemap {
  constructor() {
    const basemapMetadata = {
      isLegendExpanded: false,
      wasLegendExpanded: false,
      exclusiveGroup: false,
      isExpanded: false,
      isChecked: false,
      thumbnail: 'images/basemap_osm.webp'
    };

    super({ id: LayerConsts.LayerOsmId, name: 'OpenStreetMap', metadata: { ...basemapMetadata } });
    this.layersList.push(new LayerOsm(0));
  }
}
