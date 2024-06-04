import { Map } from 'ol';
import { Layer as OLayer } from 'ol/layer';
import TileLayer from 'ol/layer/WebGLTile';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import LayerCog from '../../../models/layers/layercog';

class CogManager {
  map: Map;
  basemapLayers: TileLayer[] = [];
  activeLayers: Record<
    string,
    {
      olayer: OLayer;
      layer: LayerCog;
    }
  > = {};

  constructor(map: Map) {
    this.map = map;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addBasemapLayer(layer: LayerCog) {
    const source = new GeoTIFF({
      sources: [{ url: layer.source }]
    });
    const olayer = new TileLayer({ source: source });
    this.basemapLayers.push(olayer);

    // For basemap, set a minimal number (arbitrary defined to less than -5000)
    olayer.setZIndex(-5000 - layer.order);
    this.map.addLayer(olayer);
  }

  addLayer(layer: LayerCog) {
    const source = new GeoTIFF({
      sources: [{ url: layer.source }]
    });
    const olayer = new TileLayer({ source: source });
    this.map.addLayer(olayer);
    this.activeLayers[layer.treeItemId] = { layer: layer, olayer: olayer };
  }

  removeLayer(layer: LayerCog) {
    const olayer = this.activeLayers[layer.treeItemId].olayer;
    delete this.activeLayers[layer.treeItemId];
    this.map.removeLayer(olayer);
  }
}

export default CogManager;
