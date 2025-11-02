import { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import LayerOsm from '../../../models/layers/layerosm';
import type { Layer as OLayer } from 'ol/layer';

class OsmManager {
  map: Map;
  basemapLayers: Record<
    string,
    {
      olayer: OLayer;
      layerOsm: LayerOsm;
    }
  > = {};

  constructor(map: Map) {
    this.map = map;
  }

  removeAllBasemapLayers() {
    for (const basemap of Object.values(this.basemapLayers)) {
      this.map.removeLayer(basemap.olayer);
    }
    this.basemapLayers = {};
  }

  addBasemapLayer(layer: LayerOsm) {
    const olayer = new TileLayer({
      source: new OSM()
    });
    this.basemapLayers[layer.treeItemId] = {
      olayer: olayer,
      layerOsm: layer
    };

    // For basemap, set a minimal number (arbitrary defined to less than -5000)
    olayer.setZIndex(-5000 - layer.order);

    this.map.addLayer(olayer);
  }

  changeOpacity(layerInfos: LayerOsm) {
    if (layerInfos.hasValidOpacity) {
      this.basemapLayers[layerInfos.treeItemId].olayer.setOpacity(layerInfos.opacity);
    }
  }
}

export default OsmManager;
