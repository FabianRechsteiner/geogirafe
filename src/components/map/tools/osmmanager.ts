import { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

class OsmManager {
  map: Map;
  srid: string;

  basemapLayers: TileLayer<OSM>[] = [];

  constructor(map: Map, srid: string) {
    this.map = map;
    // TODO REG: use global state for this info, or update when map component is updated.
    this.srid = srid;
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
