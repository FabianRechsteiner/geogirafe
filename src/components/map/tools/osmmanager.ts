import { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import LayerOsm from '../../../models/layers/layerosm';

class OsmManager {
  map: Map;
  basemapLayers: TileLayer<OSM>[] = [];

  constructor(map: Map) {
    this.map = map;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap: TileLayer<OSM>) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addBasemapLayer(layer: LayerOsm) {
    const olayer = new TileLayer({
      source: new OSM()
    });
    this.basemapLayers.push(olayer);

    // For basemap, set a minimal number (arbitrary defined to less than -5000)
    olayer.setZIndex(-5000 - layer.order);

    this.map.addLayer(olayer);
  }
}

export default OsmManager;
