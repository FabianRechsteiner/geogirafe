
import VectorTileLayer from 'ol/layer/VectorTile.js';
import { applyStyle } from 'ol-mapbox-style';

class VectorTilesManager {
  map = null;
  srid = null;

  basemapLayers = [];

  constructor(map, srid) {
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

  addBasemapLayer(basemap) {
    const olayer = new VectorTileLayer({ declutter: true });
    applyStyle(olayer, basemap.style);
    this.basemapLayers.push(olayer);
    this.map.getLayers().insertAt(0, olayer);
  }
}

export default VectorTilesManager;