import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';
import { Map } from 'ol';
import { Layer as OLayer } from 'ol/layer';
import LayerWmts from '../../../models/layers/layerwmts';

class WmtsManager {
  map: Map;
  srid: string;

  wmtsCapabilitiesByServer: Record<string, {}> = {};
  wmtsLayers: Record<string, OLayer> = {};
  basemapLayers: OLayer[] = [];

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

  addLayer(layer: LayerWmts) {
    this.#addLayerInternal(layer, false);
  }

  addBasemapLayer(basemap: LayerWmts) {
    this.#addLayerInternal(basemap, true);
  }

  #addLayerInternal(layer: LayerWmts, isBasemap: boolean) {
    this.#getWmtsCapabilities(layer.url!, (capabilities: string) => {
      // TODO REG : Manage dimensions, because the "layers" can be the same with different dimensions
      const options = optionsFromCapabilities(capabilities, {
        layer: layer.layers,
        projection: this.srid
      });

      if (options === null) {
        console.log('Cannot create WMTS layer for layer ' + layer.layers);
        return;
      }

      // Set the right dimensions
      for (let key in layer.dimensions) {
        if (key in options.dimensions) {
          // Update value
          options.dimensions[key] = layer.dimensions[key];
        }
        else {
          console.warn('A dimension ' + key + ' was defined for the WMTS layer ' + layer.layers + ' but the server does not seem to accept it.')
        }
      }


      const olayer = new TileLayer({
        opacity: layer.opacity,
        source: new WMTS(options),
      });

      // Add to map
      if (isBasemap) {
        this.basemapLayers.push(olayer);
        this.map.getLayers().insertAt(0, olayer);
      }
      else {
        this.wmtsLayers[layer.layerUniqueId] = olayer;
        this.map.addLayer(olayer);
      }
    });
  }
  
  removeLayer(layer: LayerWmts) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId];
      delete this.wmtsLayers[layer.layerUniqueId];
      this.map.removeLayer(olayer);
    }
    else {
      throw new Error('Cannot remove this layer: it does not exist');
    }
  }
  
  layerExists(layer: LayerWmts) {
    return (layer.layerUniqueId in this.wmtsLayers);
  }

  getLayer(layer: LayerWmts) {
    if (this.layerExists(layer)) {
      return this.wmtsLayers[layer.layerUniqueId];
    }
    return null;
  }

  changeOpacity(layer: LayerWmts, opacity: number) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId];
      olayer.setOpacity(opacity);
    }
    else {
      throw new Error('Cannot change opacity for this layer: it does not exist');
    }
  }

  #getWmtsCapabilities(url: string, callback: Function) {
    if (url in this.wmtsCapabilitiesByServer) {
      // Capabilities were already loaded
      const capabilities = this.wmtsCapabilitiesByServer[url];
      callback(capabilities);
    }
    else {
      // Capabilities were not loaded yet.
      fetch(url)
        .then(response => response.text())
        .then(capabilities => {
          // Create new WMTS Layer from Capabilities
          const parser = new WMTSCapabilities();
          const result = parser.read(capabilities);
          this.wmtsCapabilitiesByServer[url] = result;

          callback(result);
        });
    }
  }
}

export default WmtsManager;