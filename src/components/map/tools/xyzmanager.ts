import { Map } from 'ol';
import { Layer as OLayer } from 'ol/layer';
import TileLayer from 'ol/layer/Tile';
import LayerXYZ from '../../../models/layers/layerxyz';
import { XYZ } from 'ol/source';

class XyzManager {
  map: Map;
  basemapLayers: TileLayer<XYZ>[] = [];
  activeLayers: Record<
    string,
    {
      olayer: OLayer;
      layer: LayerXYZ;
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

  addBasemapLayer(layer: LayerXYZ) {
    const source = new XYZ({ url: layer.source });
    const olayer = new TileLayer({ source: source });
    this.basemapLayers.push(olayer);

    // For basemap, set a minimal number (arbitrary defined to less than -5000)
    olayer.setZIndex(-5000 - layer.order);
    this.map.addLayer(olayer);
  }

  addLayer(layer: LayerXYZ) {
    const source = new XYZ({ url: layer.source });
    const olayer = new TileLayer({ source: source });
    this.map.addLayer(olayer);
    this.activeLayers[layer.treeItemId] = { layer: layer, olayer: olayer };
  }

  removeLayer(layer: LayerXYZ) {
    const olayer = this.activeLayers[layer.treeItemId].olayer;
    delete this.activeLayers[layer.treeItemId];
    this.map.removeLayer(olayer);
  }
}

export default XyzManager;
