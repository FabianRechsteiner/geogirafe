import { Map } from 'ol';
import olVectorTileLayer from 'ol/layer/VectorTile.js';
import apply, { applyStyle } from 'ol-mapbox-style';
import LayerVectorTiles from '../../../models/layers/layervectortiles';
import LayerGroup from 'ol/layer/Group';

class VectorTilesManager {
  map: Map;

  basemapLayers: (olVectorTileLayer | LayerGroup)[] = [];

  public constructor(map: Map) {
    this.map = map;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  /**
   * Adds a vectortiles basemap based on its layerName. If no layerName is provided,
   * will use apply from ol-mapbox-style to create all layers.
   * @param basemap
   */
  addBasemapLayer(basemap: LayerVectorTiles) {
    let olayer: olVectorTileLayer | LayerGroup;

    if (basemap.layerName) {
      olayer = new olVectorTileLayer({ declutter: true });
      applyStyle(olayer, basemap.style, basemap.layerName);
    } else {
      olayer = new LayerGroup();
      apply(olayer, basemap.style);
    }
    this.basemapLayers.push(olayer);

    // For basemap, set a minimal number (arbitrary defined to less than -5000)
    olayer.setZIndex(-5000 - basemap.order);

    this.map.getLayers().insertAt(0, olayer);
  }
}

export default VectorTilesManager;
