import { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

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

  addBasemapLayer() {
    const olayer = new TileLayer({
      source: new OSM()
    });
    this.basemapLayers.push(olayer);
    this.map.getLayers().insertAt(0, olayer);
  }
}

export default OsmManager;
