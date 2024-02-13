import { Map } from 'ol';
import olVectorTileLayer from 'ol/layer/VectorTile.js';
import { applyStyle } from 'ol-mapbox-style';
import LayerVectorTiles from '../../../models/layers/layervectortiles';

class VectorTilesManager {
  map: Map;

  basemapLayers: olVectorTileLayer[] = [];

  constructor(map: Map) {
    this.map = map;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addBasemapLayer(basemap: LayerVectorTiles) {
    const olayer = new olVectorTileLayer({ declutter: true });
    applyStyle(olayer, basemap.style, basemap.source);
    this.basemapLayers.push(olayer);
    this.map.getLayers().insertAt(0, olayer);
  }
}

export default VectorTilesManager;
