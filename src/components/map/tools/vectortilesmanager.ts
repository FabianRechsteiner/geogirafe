import { Map } from 'ol';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import { applyStyle } from 'ol-mapbox-style';
import Layer from '../../../models/layer';

class VectorTilesManager {
  map: Map;
  srid: string;

  basemapLayers: VectorTileLayer[] = [];

  constructor(map: Map, srid: string) {
    this.map = map;
    // TODO REG: use global state for this info, or update when map component is updated.
    this.srid = srid;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addBasemapLayer(basemap:Layer) {
    const olayer = new VectorTileLayer({ declutter: true });
    applyStyle(olayer, basemap.style, basemap.source);
    this.basemapLayers.push(olayer);
    this.map.getLayers().insertAt(0, olayer);
  }
}

export default VectorTilesManager;