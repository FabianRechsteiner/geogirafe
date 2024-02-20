import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';
import { Map } from 'ol';
import { Layer as OLayer } from 'ol/layer';
import LayerWmts from '../../../models/layers/layerwmts';
import { StateManager } from '../../../tools/main';

class WmtsManager {
  map: Map;

  wmtsCapabilitiesByServer: Record<string, string> = {};
  wmtsLayers: Record<
    string,
    {
      olayer: OLayer;
      layerWmts: LayerWmts;
    }
  > = {};

  basemapLayers: OLayer[] = [];

  get state() {
    return StateManager.getInstance().state;
  }

  constructor(map: Map) {
    this.map = map;
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
      const options = optionsFromCapabilities(capabilities, {
        layer: layer.layers,
        projection: this.state.projection
      });

      if (options === null) {
        console.log('Cannot create WMTS layer for layer ' + layer.layers);
        return;
      }

      // Set the right dimensions
      for (const key in layer.dimensions) {
        if (key in options.dimensions) {
          // Update value
          options.dimensions[key] = layer.dimensions[key];
        } else {
          console.warn(
            'A dimension ' +
              key +
              ' was defined for the WMTS layer ' +
              layer.layers +
              ' but the server does not seem to accept it.'
          );
        }
      }

      const olayer = new TileLayer({
        opacity: layer.opacity,
        source: new WMTS(options)
      });

      let zindex;
      if (isBasemap) {
        this.basemapLayers.push(olayer);
        zindex = -5000 - layer.order;
      } else {
        this.wmtsLayers[layer.layerUniqueId] = { olayer: olayer, layerWmts: layer };
        zindex = -layer.order;
      }

      // Set zindex for this new layer
      // (The bigger the order is, the deeper in the map it should be displayed.)
      // (order is the inverse of z-index)
      // For basemap, set a minimal number (arbitrary defined to less than -5000)
      olayer.setZIndex(zindex);

      // Add to map
      this.map.addLayer(olayer);
    });
  }

  removeLayer(layer: LayerWmts) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId].olayer;
      delete this.wmtsLayers[layer.layerUniqueId];
      this.map.removeLayer(olayer);
    } else {
      throw new Error('Cannot remove this layer: it does not exist');
    }
  }

  layerExists(layer: LayerWmts) {
    return layer.layerUniqueId in this.wmtsLayers;
  }

  getLayer(layer: LayerWmts) {
    if (this.layerExists(layer)) {
      return this.wmtsLayers[layer.layerUniqueId].olayer;
    }
    return null;
  }

  changeOpacity(layer: LayerWmts, opacity: number) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId].olayer;
      olayer.setOpacity(opacity);
    } else {
      throw new Error('Cannot change opacity for this layer: it does not exist');
    }
  }

  #getWmtsCapabilities(url: string, callback: (capabilities: string) => void) {
    if (url in this.wmtsCapabilitiesByServer) {
      // Capabilities were already loaded
      const capabilities = this.wmtsCapabilitiesByServer[url];
      callback(capabilities);
    } else {
      // Capabilities were not loaded yet.
      fetch(url)
        .then((response) => response.text())
        .then((capabilities) => {
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
